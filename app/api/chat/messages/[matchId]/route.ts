import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/chat/types";

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
};

type MessageRow = {
  id: string;
  matchId: string;
  remitenteId: string;
  contenido: string;
  tipo: string;
  payload: Record<string, unknown> | null;
  leido: boolean;
  creadoEn: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
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

  const { data: messagesData, error: messagesError } = await supabase
    .from("mensajes")
    .select("id,matchId,remitenteId,contenido,tipo,payload,leido,creadoEn")
    .eq("matchId", matchId)
    .order("creadoEn", { ascending: true })
    .limit(5000);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const messages = ((messagesData as MessageRow[] | null) ?? []).map((item) => ({
    id: item.id,
    matchId: item.matchId,
    senderId: item.remitenteId,
    content: item.contenido,
    kind: item.tipo,
    payload: item.payload,
    read: item.leido,
    createdAt: item.creadoEn,
  })) satisfies ChatMessage[];

  return NextResponse.json({ messages });
}
