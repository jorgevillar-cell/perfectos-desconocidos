import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { pusherServer } from "@/lib/chat/pusher-server";

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
};

type Payload = {
  matchId?: string;
  isTyping?: boolean;
};

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Payload;
  const matchId = body.matchId?.trim() ?? "";
  const isTyping = Boolean(body.isTyping);

  if (!matchId) {
    return NextResponse.json({ error: "Falta matchId" }, { status: 400 });
  }

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,matchConfirmado")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (matchError || !matchData) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const isMember = matchData.usuarioAId === user.id || matchData.usuarioBId === user.id;
  if (!isMember || !matchData.matchConfirmado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await pusherServer.trigger(`chat-${matchId}`, "escribiendo", {
    userId: user.id,
    isTyping,
  });

  return NextResponse.json({ ok: true });
}
