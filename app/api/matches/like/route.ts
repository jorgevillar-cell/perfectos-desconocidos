import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { computeCompatibility } from "@/lib/chat/compatibility";
import {
  sendContactAcceptedEmail,
  sendContactRequestEmail,
} from "@/lib/notifications/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LikePayload = {
  profileId?: string;
  message?: string;
};

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  likeA: boolean;
  likeB: boolean;
  matchConfirmado: boolean;
  mensajePresentacion: string | null;
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

function normalizeMessage(message: string | undefined) {
  return (message ?? "").trim().slice(0, 300);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
}

function buildApiUrl(path: string) {
  const base = process.env.EMAIL_ACTIONS_BASE_URL ?? "https://perfectos-desconocidos-5hgb.vercel.app";
  return new URL(path, base).toString();
}

async function getUserWithProfile(client: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data, error } = await client
    .from("users")
    .select(
      "id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserForMatch;
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as LikePayload;
  const profileId = body.profileId?.trim() ?? "";
  const message = normalizeMessage(body.message);

  if (!profileId) {
    return NextResponse.json({ error: "Falta profileId" }, { status: 400 });
  }

  if (profileId === user.id) {
    return NextResponse.json({ error: "No puedes solicitar contacto contigo mismo" }, { status: 400 });
  }

  const requesterClient = await createSupabaseServerClient();
  const [requesterUser, targetUser] = await Promise.all([
    getUserWithProfile(requesterClient, user.id),
    getUserWithProfile(requesterClient, profileId),
  ]);

  if (!requesterUser || !targetUser) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const requesterProfile = firstProfile(requesterUser.perfil_convivencia);
  const targetProfile = firstProfile(targetUser.perfil_convivencia);
  const compatibility = computeCompatibility(requesterProfile, targetProfile);

  const direct = await requesterClient
    .from("matches")
    .select("id,usuarioAId,usuarioBId,likeA,likeB,matchConfirmado,mensajePresentacion,estado,tokenAceptar")
    .eq("usuarioAId", user.id)
    .eq("usuarioBId", profileId)
    .maybeSingle<MatchRow>();

  if (direct.data?.matchConfirmado) {
    return NextResponse.json({
      ok: true,
      estado: "solicitud_aceptada",
      matchId: direct.data.id,
      matchConfirmado: true,
      compatibility,
      otherUserName: targetUser.nombre,
      otherUserPhoto: targetUser.fotoUrl,
      chatWithUserId: profileId,
    });
  }

  if (direct.data?.estado === "solicitud_pendiente" && direct.data.usuarioAId === user.id) {
    return NextResponse.json({
      ok: true,
      estado: direct.data.estado,
      matchId: direct.data.id,
      matchConfirmado: false,
      compatibility,
      otherUserName: targetUser.nombre,
      otherUserPhoto: targetUser.fotoUrl,
    });
  }

  if (direct.data && direct.data.estado === "solicitud_rechazada") {
    const tokenAceptar = randomUUID();
    const { data: updated, error: updateError } = await requesterClient
      .from("matches")
      .update({
        likeA: true,
        likeB: false,
        matchConfirmado: false,
        mensajePresentacion: message || null,
        estado: "solicitud_pendiente",
        tokenAceptar,
        fechaSolicitud: new Date().toISOString(),
      })
      .eq("id", direct.data.id)
      .select("id,matchConfirmado,estado,tokenAceptar")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "No se pudo actualizar la solicitud" }, { status: 500 });
    }

    await sendContactRequestEmail({
      to: [targetUser.email],
      senderName: requesterUser.nombre,
      senderAge: requesterUser.edad,
      senderPhotoUrl: requesterUser.fotoUrl,
      compatibility,
      message: message || `${requesterUser.nombre} quiere empezar a hablar contigo en Perfectos Desconocidos.`,
      acceptUrl: buildApiUrl(`/api/matches/solicitudes/${updated.tokenAceptar ?? tokenAceptar}/accept`),
      rejectUrl: buildApiUrl(`/api/matches/solicitudes/${updated.tokenAceptar ?? tokenAceptar}/reject`),
    });

    return NextResponse.json({
      ok: true,
      estado: updated.estado,
      matchId: updated.id,
      matchConfirmado: false,
      compatibility,
      otherUserName: targetUser.nombre,
      otherUserPhoto: targetUser.fotoUrl,
    });
  }

  const reverse = await requesterClient
    .from("matches")
    .select("id,usuarioAId,usuarioBId,likeA,likeB,matchConfirmado,mensajePresentacion,estado,tokenAceptar")
    .eq("usuarioAId", profileId)
    .eq("usuarioBId", user.id)
    .maybeSingle<MatchRow>();

  if (reverse.data?.matchConfirmado) {
    return NextResponse.json({
      ok: true,
      estado: "solicitud_aceptada",
      matchId: reverse.data.id,
      matchConfirmado: true,
      compatibility,
      otherUserName: targetUser.nombre,
      otherUserPhoto: targetUser.fotoUrl,
      chatWithUserId: profileId,
    });
  }

  if (reverse.data?.estado === "solicitud_pendiente") {
    const { data: updated, error: updateError } = await requesterClient
      .from("matches")
      .update({
        likeB: true,
        matchConfirmado: true,
        estado: "solicitud_aceptada",
        tokenAceptar: null,
      })
      .eq("id", reverse.data.id)
      .select("id,matchConfirmado,estado")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "No se pudo confirmar la solicitud" }, { status: 500 });
    }

    await sendContactAcceptedEmail({
      to: [requesterUser.email, targetUser.email],
      recipientName: targetUser.nombre,
      recipientPhotoUrl: targetUser.fotoUrl,
      compatibility,
      chatUrl: `${getAppUrl()}/explore?chatWith=${profileId}&matchId=${updated.id}&celebrate=1&matchName=${encodeURIComponent(targetUser.nombre)}&matchPhoto=${encodeURIComponent(targetUser.fotoUrl ?? "")}&compatibility=${compatibility}`,
    });

    return NextResponse.json({
      ok: true,
      estado: updated.estado,
      matchId: updated.id,
      matchConfirmado: true,
      compatibility,
      otherUserName: targetUser.nombre,
      otherUserPhoto: targetUser.fotoUrl,
      chatWithUserId: profileId,
    });
  }

  const tokenAceptar = randomUUID();
  const { data: inserted, error: insertError } = await requesterClient
    .from("matches")
    .insert({
      usuarioAId: user.id,
      usuarioBId: profileId,
      likeA: true,
      likeB: false,
      matchConfirmado: false,
      mensajePresentacion: message || null,
      estado: "solicitud_pendiente",
      tokenAceptar,
      fechaSolicitud: new Date().toISOString(),
    })
    .select("id,matchConfirmado,estado,tokenAceptar")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const created = inserted as MatchRow | null;
  if (!created) {
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }

  await sendContactRequestEmail({
    to: [targetUser.email],
    senderName: requesterUser.nombre,
    senderAge: requesterUser.edad,
    senderPhotoUrl: requesterUser.fotoUrl,
    compatibility,
    message: message || `${requesterUser.nombre} quiere empezar a hablar contigo en Perfectos Desconocidos.`,
    acceptUrl: buildApiUrl(`/api/matches/solicitudes/${created.tokenAceptar ?? tokenAceptar}/accept`),
    rejectUrl: buildApiUrl(`/api/matches/solicitudes/${created.tokenAceptar ?? tokenAceptar}/reject`),
  });

  return NextResponse.json({
    ok: true,
    estado: created.estado,
    matchId: created.id,
    matchConfirmado: false,
    compatibility,
    otherUserName: targetUser.nombre,
    otherUserPhoto: targetUser.fotoUrl,
  });
}
