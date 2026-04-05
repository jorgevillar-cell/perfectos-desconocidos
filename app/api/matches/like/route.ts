import { NextResponse } from "next/server";

import { computeCompatibility } from "@/lib/chat/compatibility";
import { pusherServer } from "@/lib/chat/pusher-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type LikePayload = {
  profileId?: string;
};

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  likeA: boolean;
  likeB: boolean;
  matchConfirmado: boolean;
};

type UserForMatch = {
  id: string;
  nombre: string;
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

async function emitMatchConfirmed(match: MatchRow) {
  const { data: usersData } = await supabase
    .from("users")
    .select("id,nombre,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
    .in("id", [match.usuarioAId, match.usuarioBId]);

  const users = (usersData as UserForMatch[] | null) ?? [];
  const userA = users.find((item) => item.id === match.usuarioAId);
  const userB = users.find((item) => item.id === match.usuarioBId);

  if (!userA || !userB) {
    return;
  }

  const profileA = firstProfile(userA.perfil_convivencia);
  const profileB = firstProfile(userB.perfil_convivencia);
  const compatibility = computeCompatibility(profileA, profileB);

  await Promise.all([
    pusherServer.trigger(`user-${userA.id}`, "match-confirmado", {
      matchId: match.id,
      otherUserId: userB.id,
      otherUserName: userB.nombre,
      otherUserPhoto: userB.fotoUrl,
      compatibility,
    }),
    pusherServer.trigger(`user-${userB.id}`, "match-confirmado", {
      matchId: match.id,
      otherUserId: userA.id,
      otherUserName: userA.nombre,
      otherUserPhoto: userA.fotoUrl,
      compatibility,
    }),
  ]);

  return {
    matchId: match.id,
    compatibility,
    forA: {
      otherUserId: userB.id,
      otherUserName: userB.nombre,
      otherUserPhoto: userB.fotoUrl,
    },
    forB: {
      otherUserId: userA.id,
      otherUserName: userA.nombre,
      otherUserPhoto: userA.fotoUrl,
    },
  };
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

  if (!profileId) {
    return NextResponse.json({ error: "Falta profileId" }, { status: 400 });
  }

  if (profileId === user.id) {
    return NextResponse.json({ error: "No puedes hacer like a tu propio perfil" }, { status: 400 });
  }

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError || !targetUser) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const { data: direct } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,likeA,likeB,matchConfirmado")
    .eq("usuarioAId", user.id)
    .eq("usuarioBId", profileId)
    .maybeSingle<MatchRow>();

  if (direct) {
    const matchConfirmado = direct.likeB;

    const { data: updated, error: updateError } = await supabase
      .from("matches")
      .update({
        likeA: true,
        matchConfirmado,
      })
      .eq("id", direct.id)
      .select("id,matchConfirmado")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "No se pudo actualizar el match" }, { status: 500 });
    }

    const nextMatch: MatchRow = {
      ...direct,
      likeA: true,
      matchConfirmado: Boolean(updated.matchConfirmado),
    };

    const emitted = nextMatch.matchConfirmado ? await emitMatchConfirmed(nextMatch) : null;

    return NextResponse.json({
      ok: true,
      matchId: updated.id,
      matchConfirmado: Boolean(updated.matchConfirmado),
      compatibility: emitted?.compatibility ?? null,
      otherUserName: emitted?.forA.otherUserName ?? null,
      otherUserPhoto: emitted?.forA.otherUserPhoto ?? null,
    });
  }

  const { data: reverse } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,likeA,likeB,matchConfirmado")
    .eq("usuarioAId", profileId)
    .eq("usuarioBId", user.id)
    .maybeSingle<MatchRow>();

  if (reverse) {
    const matchConfirmado = reverse.likeA;

    const { data: updated, error: updateError } = await supabase
      .from("matches")
      .update({
        likeB: true,
        matchConfirmado,
      })
      .eq("id", reverse.id)
      .select("id,matchConfirmado")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "No se pudo actualizar el match" }, { status: 500 });
    }

    const nextMatch: MatchRow = {
      ...reverse,
      likeB: true,
      matchConfirmado: Boolean(updated.matchConfirmado),
    };

    const emitted = nextMatch.matchConfirmado ? await emitMatchConfirmed(nextMatch) : null;

    return NextResponse.json({
      ok: true,
      matchId: updated.id,
      matchConfirmado: Boolean(updated.matchConfirmado),
      compatibility: emitted?.forB ? emitted.compatibility : null,
      otherUserName: emitted?.forB.otherUserName ?? null,
      otherUserPhoto: emitted?.forB.otherUserPhoto ?? null,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("matches")
    .insert({
      usuarioAId: user.id,
      usuarioBId: profileId,
      likeA: true,
      likeB: false,
      matchConfirmado: false,
    })
    .select("id,matchConfirmado")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    matchId: inserted?.id,
    matchConfirmado: Boolean(inserted?.matchConfirmado),
  });
}
