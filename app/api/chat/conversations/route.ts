import type { PaymentSummary } from "@/lib/payments/types";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { computeCompatibility } from "@/lib/chat/compatibility";
import type { ConversationSummary } from "@/lib/chat/types";

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  creadoEn: string;
};

type UserRow = {
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

type MessageRow = {
  id: string;
  matchId: string;
  contenido: string;
  tipo: string;
  payload: Record<string, unknown> | null;
  remitenteId: string;
  leido: boolean;
  creadoEn: string;
};

type PaymentRow = {
  id: string;
  matchId: string;
  pisoId: string | null;
  cantidad: number | string;
  estado: string;
  stripePaymentIntentId: string | null;
  liberadoEn: string | null;
  creadoEn: string;
};

function firstProfile(profile: UserRow["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile;
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,creadoEn")
    .eq("matchConfirmado", true)
    .or(`usuarioAId.eq.${user.id},usuarioBId.eq.${user.id}`);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const matches = (matchesData as MatchRow[] | null) ?? [];
  if (!matches.length) {
    return NextResponse.json({ conversations: [], unreadTotal: 0 });
  }

  const matchIds = matches.map((item) => item.id);
  const otherUserIds = matches.map((item) => (item.usuarioAId === user.id ? item.usuarioBId : item.usuarioAId));

  const [{ data: usersData }, { data: messagesData }, { data: unreadData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("users")
      .select("id,nombre,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
      .in("id", [...new Set([user.id, ...otherUserIds])]),
    supabase
      .from("mensajes")
      .select("id,matchId,contenido,tipo,payload,remitenteId,leido,creadoEn")
      .in("matchId", matchIds)
      .order("creadoEn", { ascending: false })
      .limit(1000),
    supabase
      .from("mensajes")
      .select("id,matchId")
      .in("matchId", matchIds)
      .eq("leido", false)
      .neq("remitenteId", user.id),
    supabase
      .from("pagos")
      .select("id,matchId,pisoId,cantidad,estado,stripePaymentIntentId,liberadoEn,creadoEn")
      .in("matchId", matchIds)
      .order("creadoEn", { ascending: false })
      .limit(1000),
  ]);

  const users = (usersData as UserRow[] | null) ?? [];
  const messages = (messagesData as MessageRow[] | null) ?? [];
  const unreadRows = (unreadData as Array<{ id: string; matchId: string }> | null) ?? [];
  const payments = (paymentsData as PaymentRow[] | null) ?? [];

  const byUserId = new Map(users.map((item) => [item.id, item]));
  const unreadByMatch = new Map<string, number>();
  for (const row of unreadRows) {
    unreadByMatch.set(row.matchId, (unreadByMatch.get(row.matchId) ?? 0) + 1);
  }

  const lastMessageByMatch = new Map<string, MessageRow>();
  for (const message of messages) {
    if (!lastMessageByMatch.has(message.matchId)) {
      lastMessageByMatch.set(message.matchId, message);
    }
  }

  const latestPaymentByMatch = new Map<string, PaymentRow>();
  for (const payment of payments) {
    if (!latestPaymentByMatch.has(payment.matchId)) {
      latestPaymentByMatch.set(payment.matchId, payment);
    }
  }

  const me = byUserId.get(user.id) ?? null;
  const meProfile = me ? firstProfile(me.perfil_convivencia) : null;

  const conversations: ConversationSummary[] = matches
    .map((match) => {
      const otherUserId = match.usuarioAId === user.id ? match.usuarioBId : match.usuarioAId;
      const other = byUserId.get(otherUserId);
      if (!other) return null;

      const otherProfile = firstProfile(other.perfil_convivencia);
      const compatibility = computeCompatibility(meProfile, otherProfile);
      const unreadCount = unreadByMatch.get(match.id) ?? 0;
      const lastMessage = lastMessageByMatch.get(match.id) ?? null;
      const latestPayment = latestPaymentByMatch.get(match.id) ?? null;

      return {
        matchId: match.id,
        otherUserId,
        otherUserName: other.nombre,
        otherUserPhoto: other.fotoUrl,
        otherUserOnline: false,
        otherUserLastSeenAt: null,
        compatibility,
        unreadCount,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.contenido,
              kind: lastMessage.tipo,
              payload: lastMessage.payload,
              createdAt: lastMessage.creadoEn,
              senderId: lastMessage.remitenteId,
            }
          : null,
        latestPayment: latestPayment
          ? {
              id: latestPayment.id,
              matchId: latestPayment.matchId,
              pisoId: latestPayment.pisoId,
              cantidad: Number(latestPayment.cantidad),
              estado: latestPayment.estado as PaymentSummary["estado"],
              stripePaymentIntentId: latestPayment.stripePaymentIntentId,
              liberadoEn: latestPayment.liberadoEn,
              creadoEn: latestPayment.creadoEn,
            }
          : null,
        __matchCreatedAt: match.creadoEn,
      } as ConversationSummary & { __matchCreatedAt: string };
    })
    .filter((item): item is (ConversationSummary & { __matchCreatedAt: string }) => item !== null)
    .sort((a, b) => {
      const aTime = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : Date.parse(a.__matchCreatedAt);
      const bTime = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : Date.parse(b.__matchCreatedAt);
      return bTime - aTime;
    })
    .map((item) => {
      const { __matchCreatedAt, ...next } = item;
      return next;
    });

  const unreadTotal = conversations.reduce((acc, item) => acc + item.unreadCount, 0);

  return NextResponse.json({ currentUserId: user.id, conversations, unreadTotal });
}
