export type PaymentStatus =
  | "pendiente"
  | "autorizado"
  | "pagado"
  | "liberado"
  | "incidencia_abierta"
  | "reembolso_total"
  | "reembolso_parcial"
  | "fallido";

export type IncidentStatus = "abierta" | "resuelta_inquilino" | "resuelta_propietario";

export type PaymentSummary = {
  id: string;
  matchId: string;
  pisoId: string | null;
  cantidad: number;
  estado: PaymentStatus;
  stripePaymentIntentId: string | null;
  liberadoEn: string | null;
  creadoEn: string;
};

export type PaymentMessagePayload = {
  paymentId: string;
  amount: number;
  status: PaymentStatus;
  paymentUrl?: string;
  note?: string;
};

export type StripeConnectStatus =
  | "pendiente"
  | "verificada"
  | "lista"
  | "problema";