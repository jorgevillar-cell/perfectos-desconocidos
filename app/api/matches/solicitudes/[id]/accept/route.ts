import { NextResponse, type NextRequest } from "next/server";

import { computeCompatibility } from "@/lib/chat/compatibility";
import { pusherServer } from "@/lib/chat/pusher-server";
import { sendContactAcceptedEmail } from "@/lib/notifications/email";
import { resolveContactRequestById } from "@/lib/matches/solicitudes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
  estado: string;
  tokenAceptar: string | null;
};

type UserForMatch = {
  id: string;
  nombre: string;
  edad: number;
  email: string;
  fotoUrl: string | null;
  perfil_convivencia:
    | {
        universidad: string | null;
        presupuesto: number | string;
        fumar: boolean;
        mascotas: boolean;
        horario: string;
        ambiente: string;
        deporte: string;
        aficiones: string[];
      }
    | Array<{
        universidad: string | null;
        presupuesto: number | string;
        fumar: boolean;
        mascotas: boolean;
        horario: string;
        ambiente: string;
        deporte: string;
        aficiones: string[];
      }>
    | null;
};

function firstProfile(profile: UserForMatch["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: token } = await params;
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,matchConfirmado,estado,tokenAceptar")
    .eq("tokenAceptar", token)
    .maybeSingle<MatchRow>();

  if (matchError || !match) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (match.usuarioBId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (match.matchConfirmado || match.estado === "solicitud_aceptada") {
    const chatUrl = new URL(
      `/explore?chatWith=${match.usuarioAId}&matchId=${match.id}&celebrate=1`,
      getAppUrl(),
    );
    return NextResponse.redirect(chatUrl);
  }

  const [requester, recipient] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)",
      )
      .eq("id", match.usuarioAId)
      .maybeSingle(),
    supabase
      .from("users")
      .select(
        "id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)",
      )
      .eq("id", match.usuarioBId)
      .maybeSingle(),
  ]);

  if (!requester.data || !recipient.data) {
    return NextResponse.json({ error: "No se pudo resolver la solicitud" }, { status: 500 });
  }

  const requesterUser = requester.data as UserForMatch;
  const recipientUser = recipient.data as UserForMatch;
  const compatibility = computeCompatibility(
    firstProfile(requesterUser.perfil_convivencia),
    firstProfile(recipientUser.perfil_convivencia),
  );

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update({
      matchConfirmado: true,
      estado: "solicitud_aceptada",
      tokenAceptar: null,
    })
    .eq("id", match.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "No se pudo aceptar la solicitud" }, { status: 500 });
  }

  await sendContactAcceptedEmail({
    to: [requesterUser.email],
    recipientName: recipientUser.nombre,
    recipientPhotoUrl: recipientUser.fotoUrl,
    compatibility,
    chatUrl: `${getAppUrl()}/explore?chatWith=${recipientUser.id}&matchId=${match.id}&celebrate=1&matchName=${encodeURIComponent(recipientUser.nombre)}&matchPhoto=${encodeURIComponent(recipientUser.fotoUrl ?? "")}&compatibility=${compatibility}`,
  });

  return NextResponse.redirect(
    new URL(
      `/explore?chatWith=${requesterUser.id}&matchId=${match.id}&celebrate=1&matchName=${encodeURIComponent(requesterUser.nombre)}&matchPhoto=${encodeURIComponent(requesterUser.fotoUrl ?? "")}&compatibility=${compatibility}`,
      getAppUrl(),
    ),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const resolved = await resolveContactRequestById(supabase, id, user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (resolved.normalizedState === "solicitud_aceptada") {
    return NextResponse.json({
      ok: true,
      matchId: resolved.request.id,
      estado: resolved.normalizedState,
      otherUserId: resolved.requester.id,
      otherUserName: resolved.requester.nombre,
      otherUserPhoto: resolved.requester.fotoUrl,
      compatibility: resolved.compatibility,
      chatUrl: `/explore?chatWith=${resolved.requester.id}&matchId=${resolved.request.id}&celebrate=1&matchName=${encodeURIComponent(resolved.requester.nombre)}&matchPhoto=${encodeURIComponent(resolved.requester.fotoUrl ?? "")}&compatibility=${resolved.compatibility}`,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update({
      matchConfirmado: true,
      estado: "solicitud_aceptada",
      tokenAceptar: null,
    })
    .eq("id", resolved.request.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "No se pudo aceptar la solicitud" }, { status: 500 });
  }

  await Promise.all([
    pusherServer.trigger(`user-${resolved.requester.id}`, "match-confirmado", {
      matchId: resolved.request.id,
      otherUserId: resolved.recipient.id,
      otherUserName: resolved.recipient.nombre,
      otherUserPhoto: resolved.recipient.fotoUrl,
      compatibility: resolved.compatibility,
    }),
    pusherServer.trigger(`user-${resolved.recipient.id}`, "match-confirmado", {
      matchId: resolved.request.id,
      otherUserId: resolved.requester.id,
      otherUserName: resolved.requester.nombre,
      otherUserPhoto: resolved.requester.fotoUrl,
      compatibility: resolved.compatibility,
    }),
    sendContactAcceptedEmail({
      to: [resolved.requester.email],
      recipientName: resolved.recipient.nombre,
      recipientPhotoUrl: resolved.recipient.fotoUrl,
      compatibility: resolved.compatibility,
      chatUrl: `${getAppUrl()}/explore?chatWith=${resolved.recipient.id}&matchId=${resolved.request.id}&celebrate=1&matchName=${encodeURIComponent(resolved.recipient.nombre)}&matchPhoto=${encodeURIComponent(resolved.recipient.fotoUrl ?? "")}&compatibility=${resolved.compatibility}`,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    matchId: resolved.request.id,
    estado: "solicitud_aceptada",
    otherUserId: resolved.requester.id,
    otherUserName: resolved.requester.nombre,
    otherUserPhoto: resolved.requester.fotoUrl,
    compatibility: resolved.compatibility,
    chatUrl: `/explore?chatWith=${resolved.requester.id}&matchId=${resolved.request.id}&celebrate=1&matchName=${encodeURIComponent(resolved.requester.nombre)}&matchPhoto=${encodeURIComponent(resolved.requester.fotoUrl ?? "")}&compatibility=${resolved.compatibility}`,
  });
}