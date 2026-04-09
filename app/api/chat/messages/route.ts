import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { pusherServer } from "@/lib/chat/pusher-server";
import { sendNewChatMessageEmail } from "@/lib/notifications/email";

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
};

type Payload = {
  matchId?: string;
  content?: string;
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
  const content = body.content?.trim() ?? "";

  if (!matchId || !content) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
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

  const { data: inserted, error: insertError } = await supabase
    .from("mensajes")
    .insert({
      matchId,
      remitenteId: user.id,
      contenido: content,
      tipo: "text",
      payload: null,
      leido: false,
    })
    .select("id,matchId,remitenteId,contenido,tipo,payload,leido,creadoEn")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo enviar" }, { status: 500 });
  }

  const payload = {
    id: inserted.id,
    matchId: inserted.matchId,
    senderId: inserted.remitenteId,
    content: inserted.contenido,
    kind: inserted.tipo,
    payload: inserted.payload ?? null,
    read: inserted.leido,
    createdAt: inserted.creadoEn,
  };

  await pusherServer.trigger(`chat-${matchId}`, "nuevo-mensaje", payload);
  await pusherServer.trigger(`chat-${matchId}`, "escribiendo", {
    userId: user.id,
    isTyping: false,
  });

  try {
    const recipientUserId = matchData.usuarioAId === user.id ? matchData.usuarioBId : matchData.usuarioAId;
    const { data: recipientUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", recipientUserId)
      .maybeSingle<{ email: string | null }>();

    const { data: senderUser } = await supabase
      .from("users")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle<{ nombre: string | null }>();

    const recipientEmail = recipientUser?.email?.trim();
    if (recipientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
      const senderName = senderUser?.nombre?.trim() || "Tu contacto";

      await sendNewChatMessageEmail({
        to: [recipientEmail],
        senderName,
        messagePreview: content,
        chatUrl: `${appUrl}/explore?chatWith=${user.id}&matchId=${matchId}`,
      });
    }
  } catch (emailError) {
    console.error("[chat:message-email:error]", emailError);
  }

  return NextResponse.json({ ok: true, message: payload });
}
