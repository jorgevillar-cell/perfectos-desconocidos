import type { PaymentSummary, PaymentStatus } from "@/lib/payments/types";

export type ConversationSummary = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  otherUserOnline: boolean;
  otherUserLastSeenAt: string | null;
  compatibility: number;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    kind: string;
    payload: Record<string, unknown> | null;
    createdAt: string;
    senderId: string;
  } | null;
  latestPayment: PaymentSummary | null;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  kind: string;
  payload: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

export type ChatPaymentCard = {
  paymentId: string;
  amount: number;
  status: PaymentStatus;
  paymentUrl?: string;
  note?: string;
};

export type MatchCelebrationPayload = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  compatibility: number;
};
