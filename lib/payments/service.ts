import "server-only";

import { NextResponse } from "next/server";

import { pusherServer } from "@/lib/chat/pusher-server";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { supabase } from "@/lib/supabase";
import { formatMoney, ownerPayoutAmount, platformFeeAmount, stripe } from "@/lib/stripe";
import type { ChatMessage } from "@/lib/chat/types";
import type { IncidentStatus, PaymentMessagePayload, PaymentStatus, PaymentSummary } from "@/lib/payments/types";

type PaymentRow = {
  id: string;
  matchId: string;
  pisoId: string | null;
  inquilinoId: string;
  propietarioId: string;
  cantidad: number | string;
  estado: string;
  stripePaymentIntentId: string | null;
  liberadoEn: string | null;
  creadoEn: string;
};

type MatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
};

type UserRow = {
  id: string;
  nombre: string;
  email: string;
  fotoUrl: string | null;
  stripeAccountId: string | null;
  perfil_convivencia:
    | {
        situacion: string;
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
        situacion: string;
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

type PisoRow = {
  id: string;
  propietarioId: string;
  precio: number | string;
  zona: string;
  direccion: string | null;
  descripcion: string;
  fotos: string[];
};

type IncidentRow = {
  id: string;
  pagoId: string;
  descripcion: string;
  estado: string;
  fotos: string[];
  resolucion: string | null;
  resueltaEn: string | null;
  creadoEn: string;
};

function firstProfile(profile: UserRow["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile;
}

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function paymentFromRow(row: PaymentRow): PaymentSummary {
  return {
    id: row.id,
    matchId: row.matchId,
    pisoId: row.pisoId,
    cantidad: asNumber(row.cantidad),
    estado: row.estado as PaymentStatus,
    stripePaymentIntentId: row.stripePaymentIntentId,
    liberadoEn: row.liberadoEn,
    creadoEn: row.creadoEn,
  };
}

export async function getPaymentRow(paymentId: string) {
  const { data, error } = await supabase
    .from("pagos")
    .select("id,matchId,pisoId,inquilinoId,propietarioId,cantidad,estado,stripePaymentIntentId,liberadoEn,creadoEn")
    .eq("id", paymentId)
    .maybeSingle<PaymentRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPaymentSummary(paymentId: string) {
  const row = await getPaymentRow(paymentId);
  return row ? paymentFromRow(row) : null;
}

export async function getMatch(matchId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("id,usuarioAId,usuarioBId,matchConfirmado")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,nombre,email,fotoUrl,stripeAccountId,perfil_convivencia(situacion,universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
    .eq("id", userId)
    .maybeSingle<UserRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPiso(pisoId: string) {
  const { data, error } = await supabase
    .from("pisos")
    .select("id,propietarioId,precio,zona,direccion,descripcion,fotos")
    .eq("id", pisoId)
    .maybeSingle<PisoRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPrimaryPisoForUser(userId: string) {
  const { data, error } = await supabase
    .from("pisos")
    .select("id,propietarioId,precio,zona,direccion,descripcion,fotos")
    .eq("propietarioId", userId)
    .order("disponibleDesde", { ascending: true })
    .limit(1)
    .maybeSingle<PisoRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function createConnectAccountLink(params: {
  userId: string;
  email: string;
  returnUrl: string;
  refreshUrl: string;
}) {
  let user = await getUser(params.userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (!user.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "ES",
      email: params.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        userId: params.userId,
      },
    });

    const { error } = await supabase
      .from("users")
      .update({
        stripeAccountId: account.id,
      })
      .eq("id", params.userId);

    if (error) {
      throw new Error(error.message);
    }

    user = {
      ...user,
      stripeAccountId: account.id,
    };
  }

  if (!user.stripeAccountId) {
    throw new Error("No se pudo obtener la cuenta Stripe del usuario");
  }

  const link = await stripe.accountLinks.create({
    account: user.stripeAccountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });

  return { accountId: user.stripeAccountId, url: link.url };
}

export async function getConnectAccountStatus(userId: string) {
  const user = await getUser(userId);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (!user.stripeAccountId) {
    return {
      status: "pendiente" as const,
      account: null,
      user,
    };
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  const currentlyDue = account.requirements?.currently_due?.length ?? 0;
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const chargesEnabled = Boolean(account.charges_enabled);

  const status = disabledReason
    ? "problema"
    : payoutsEnabled && chargesEnabled && currentlyDue === 0
      ? "lista"
      : "verificada";

  if (status === "verificada" || status === "lista") {
    await supabase
      .from("users")
      .update({ verificado: true })
      .eq("id", userId);
  }

  return {
    status,
    account,
    user,
  };
}

export async function createPaymentIntentForPayment(paymentId: string) {
  const payment = await getPaymentRow(paymentId);
  if (!payment) {
    throw new Error("Pago no encontrado");
  }

  if (payment.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    return {
      payment: paymentFromRow(payment),
      clientSecret: existing.client_secret ?? null,
    };
  }

  const amount = Math.round(asNumber(payment.cantidad) * 100);
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    capture_method: "manual",
    payment_method_types: ["card"],
    description: `Pago del primer mes - ${payment.id}`,
    metadata: {
      paymentId: payment.id,
      matchId: payment.matchId,
      pisoId: payment.pisoId ?? "",
      inquilinoId: payment.inquilinoId,
      propietarioId: payment.propietarioId,
    },
  });

  const { error } = await supabase
    .from("pagos")
    .update({ stripePaymentIntentId: intent.id })
    .eq("id", payment.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    payment: paymentFromRow(payment),
    clientSecret: intent.client_secret ?? null,
  };
}

export async function upsertPaymentStatus(paymentId: string, status: PaymentStatus, extra?: Partial<PaymentRow>) {
  const updates: Record<string, unknown> = { estado: status };

  if (extra) {
    Object.assign(updates, extra);
  }

  const { error } = await supabase.from("pagos").update(updates).eq("id", paymentId);
  if (error) {
    throw new Error(error.message);
  }

  return getPaymentSummary(paymentId);
}

export async function createPaymentRequestMessage(params: {
  matchId: string;
  senderId: string;
  paymentId: string;
  amount: number;
}) {
  const payload: PaymentMessagePayload = {
    paymentId: params.paymentId,
    amount: params.amount,
    status: "pendiente",
    paymentUrl: `/payment/${params.paymentId}`,
    note: "Pago seguro con custodia de 48h",
  };

  const { data, error } = await supabase
    .from("mensajes")
    .insert({
      matchId: params.matchId,
      remitenteId: params.senderId,
      contenido: "Solicitud de pago del primer mes",
      tipo: "payment_request",
      payload,
      leido: false,
    })
    .select("id,matchId,remitenteId,contenido,tipo,payload,leido,creadoEn")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la tarjeta de pago");
  }

  const message = {
    id: data.id,
    matchId: data.matchId,
    senderId: data.remitenteId,
    content: data.contenido,
    kind: data.tipo,
    payload: data.payload,
    read: data.leido,
    createdAt: data.creadoEn,
  } satisfies ChatMessage;

  await pusherServer.trigger(`chat-${params.matchId}`, "nuevo-mensaje", message);

  return message;
}

export async function createPaymentStatusMessage(params: {
  matchId: string;
  senderId: string;
  paymentId: string;
  amount: number;
  status: PaymentStatus;
  note: string;
}) {
  const payload: PaymentMessagePayload = {
    paymentId: params.paymentId,
    amount: params.amount,
    status: params.status,
    paymentUrl: `/payment/${params.paymentId}`,
    note: params.note,
  };

  const { data, error } = await supabase
    .from("mensajes")
    .insert({
      matchId: params.matchId,
      remitenteId: params.senderId,
      contenido: params.note,
      tipo: "payment_update",
      payload,
      leido: false,
    })
    .select("id,matchId,remitenteId,contenido,tipo,payload,leido,creadoEn")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo enviar el aviso de pago");
  }

  const message = {
    id: data.id,
    matchId: data.matchId,
    senderId: data.remitenteId,
    content: data.contenido,
    kind: data.tipo,
    payload: data.payload,
    read: data.leido,
    createdAt: data.creadoEn,
  } satisfies ChatMessage;

  await pusherServer.trigger(`chat-${params.matchId}`, "nuevo-mensaje", message);

  return message;
}

export async function triggerPaymentUpdate(payment: PaymentSummary, matchId: string) {
  await pusherServer.trigger(`chat-${matchId}`, "pago-actualizado", {
    payment,
    amountLabel: formatMoney(payment.cantidad),
    ownerPayout: formatMoney(ownerPayoutAmount(payment.cantidad)),
    platformFee: formatMoney(platformFeeAmount(payment.cantidad)),
  });
}

export async function sendPaymentEmails(params: {
  buyerEmail: string;
  ownerEmail: string;
  subject: string;
  payment: PaymentSummary;
}) {
  const amountLabel = formatMoney(params.payment.cantidad);
  await sendNotificationEmail({
    to: [params.buyerEmail, params.ownerEmail],
    subject: params.subject,
    html: `<p>${params.subject}</p><p>Importe: <strong>${amountLabel}</strong></p>`,
  });
}

export async function createIncidentRecord(params: {
  paymentId: string;
  descripcion: string;
  fotos: string[];
}) {
  const { data, error } = await supabase
    .from("incidencias")
    .insert({
      pagoId: params.paymentId,
      descripcion: params.descripcion,
      estado: "abierta" satisfies IncidentStatus,
      fotos: params.fotos,
    })
    .select("id,pagoId,descripcion,estado,fotos,resolucion,resueltaEn,creadoEn")
    .single<IncidentRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la incidencia");
  }

  return data;
}

export async function listPaymentsReadyToSettle() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("pagos")
    .select("id,matchId,pisoId,inquilinoId,propietarioId,cantidad,estado,stripePaymentIntentId,liberadoEn,creadoEn")
    .eq("estado", "pagado")
    .lt("creadoEn", cutoff);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PaymentRow[]).map(paymentFromRow);
}

export async function hasOpenIncidents(paymentId: string) {
  const { data, error } = await supabase
    .from("incidencias")
    .select("id")
    .eq("pagoId", paymentId)
    .eq("estado", "abierta")
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean((data ?? []).length);
}

export async function settlePayment(paymentId: string) {
  const row = await getPaymentRow(paymentId);
  if (!row) {
    throw new Error("Pago no encontrado");
  }

  if (row.estado !== "pagado") {
    return paymentFromRow(row);
  }

  const [owner, payment] = await Promise.all([getUser(row.propietarioId), getPaymentSummary(row.id)]);
  if (!owner?.stripeAccountId || !payment) {
    throw new Error("El propietario no tiene cuenta Stripe conectada");
  }

  if (await hasOpenIncidents(paymentId)) {
    await upsertPaymentStatus(paymentId, "incidencia_abierta");
    return payment;
  }

  if (row.stripePaymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(row.stripePaymentIntentId);
    if (intent.status === "requires_capture") {
      await stripe.paymentIntents.capture(row.stripePaymentIntentId);
    }
  }

  const amount = Math.round(payment.cantidad * 100);
  const platformAmount = platformFeeAmount(payment.cantidad) * 100;
  const ownerAmount = Math.max(0, amount - platformAmount);

  const transfer = await stripe.transfers.create({
    amount: ownerAmount,
    currency: "eur",
    destination: owner.stripeAccountId,
    transfer_group: payment.id,
    description: `Liberación de pago ${payment.id}`,
  });

  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "liberado",
      liberadoEn: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (error) {
    throw new Error(error.message);
  }

  await pusherServer.trigger(`chat-${payment.matchId}`, "pago-actualizado", {
    payment: {
      ...payment,
      estado: "liberado",
      liberadoEn: new Date().toISOString(),
    },
    amountLabel: formatMoney(payment.cantidad),
    ownerPayout: formatMoney(ownerAmount / 100),
    platformFee: formatMoney(platformAmount / 100),
    transferId: transfer.id,
  });

  return {
    ...payment,
    estado: "liberado" as PaymentStatus,
    liberadoEn: new Date().toISOString(),
  };
}

export function sendJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}