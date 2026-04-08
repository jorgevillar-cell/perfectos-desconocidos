import { NextResponse, type NextRequest } from "next/server";

import { sendContactRejectedEmail } from "@/lib/notifications/email";
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

  const requester = await supabase
    .from("users")
    .select("id,nombre,email")
    .eq("id", match.usuarioAId)
    .maybeSingle();

  const recipient = await supabase
    .from("users")
    .select("id,nombre,email")
    .eq("id", match.usuarioBId)
    .maybeSingle();

  if (!requester.data || !recipient.data) {
    return NextResponse.json({ error: "No se pudo resolver la solicitud" }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update({
      matchConfirmado: false,
      estado: "solicitud_rechazada",
      tokenAceptar: null,
    })
    .eq("id", match.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "No se pudo rechazar la solicitud" }, { status: 500 });
  }

  await sendContactRejectedEmail({
    to: [requester.data.email],
    senderName: requester.data.nombre,
    recipientName: recipient.data.nombre,
    exploreUrl: `${getAppUrl()}/explore`,
  });

  return NextResponse.redirect(new URL("/explore?request=rejected", getAppUrl()));
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

  if (resolved.normalizedState === "solicitud_rechazada") {
    return NextResponse.json({
      ok: true,
      matchId: resolved.request.id,
      estado: resolved.normalizedState,
      otherUserId: resolved.requester.id,
      otherUserName: resolved.requester.nombre,
      otherUserPhoto: resolved.requester.fotoUrl,
      compatibility: resolved.compatibility,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update({
      matchConfirmado: false,
      estado: "solicitud_rechazada",
      tokenAceptar: null,
    })
    .eq("id", resolved.request.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "No se pudo rechazar la solicitud" }, { status: 500 });
  }

  await sendContactRejectedEmail({
    to: [resolved.requester.email],
    senderName: resolved.requester.nombre,
    recipientName: resolved.recipient.nombre,
    exploreUrl: `${getAppUrl()}/explore`,
  });

  return NextResponse.json({
    ok: true,
    matchId: resolved.request.id,
    estado: "solicitud_rechazada",
    otherUserId: resolved.requester.id,
    otherUserName: resolved.requester.nombre,
    otherUserPhoto: resolved.requester.fotoUrl,
    compatibility: resolved.compatibility,
  });
}