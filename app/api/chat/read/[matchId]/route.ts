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

export async function POST(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { matchId } = await params;

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

  const { error: updateError } = await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("matchId", matchId)
    .neq("remitenteId", user.id)
    .eq("leido", false);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await pusherServer.trigger(`chat-${matchId}`, "mensajes-leidos", {
    readerId: user.id,
    readAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
