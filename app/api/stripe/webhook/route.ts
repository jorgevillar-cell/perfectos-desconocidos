import { NextResponse } from "next/server";

import { sendOwnerPaymentReceivedEmail, sendTenantPaymentSuccessEmail } from "@/lib/notifications/email";
import { createPaymentStatusMessage, getPaymentRow, getPiso, getUser, triggerPaymentUpdate, upsertPaymentStatus } from "@/lib/payments/service";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://perfectos-desconocidos-5hgb.vercel.app";
}

function formatReleaseDate(createdAt: string) {
  const releaseDate = new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(releaseDate);
}

async function handlePaymentEvent(
  paymentIntent: { id: string; metadata?: Record<string, string> },
  sendEmails: boolean,
) {
  const paymentId = paymentIntent.metadata?.paymentId ?? "";
  if (!paymentId) {
    return;
  }

  const payment = await getPaymentRow(paymentId);
  if (!payment || (payment.estado !== "pendiente" && payment.estado !== "autorizado")) {
    return;
  }

  const updated = await upsertPaymentStatus(paymentId, "pagado");
  if (!updated) {
    return;
  }

  const [buyer, owner, piso] = await Promise.all([
    getUser(payment.inquilinoId),
    getUser(payment.propietarioId),
    payment.pisoId ? getPiso(payment.pisoId) : Promise.resolve(null),
  ]);
  const releaseDateLabel = formatReleaseDate(payment.creadoEn);
  const propertyAddress = piso?.direccion ?? piso?.zona ?? "Piso publicado en Perfectos Desconocidos";

  const tasks: Array<Promise<unknown>> = [
    triggerPaymentUpdate(updated, payment.matchId),
    createPaymentStatusMessage({
      matchId: payment.matchId,
      senderId: payment.inquilinoId,
      paymentId: payment.id,
      amount: updated.cantidad,
      status: "pagado",
      note: "Pago confirmado. Queda en custodia 48h.",
    }),
  ];

  if (sendEmails && buyer && owner) {
    tasks.push(
      sendTenantPaymentSuccessEmail({
        to: [buyer.email],
        payment: updated,
        ownerName: owner.nombre,
        propertyAddress,
        releaseDateLabel,
        paymentUrl: `${getAppUrl()}/payment/${updated.id}`,
      }),
    );
    tasks.push(
      sendOwnerPaymentReceivedEmail({
        to: [owner.email],
        tenantName: buyer.nombre,
        payment: updated,
        releaseDateLabel,
        detailsUrl: `${getAppUrl()}/payment/success/${updated.id}`,
      }),
    );
  }

  await Promise.all(tasks);
}

export async function POST(request: Request) {
  const stripeWebhookSecret = getStripeWebhookSecret();

  if (!stripeWebhookSecret) {
    return NextResponse.json({ error: "Falta STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta stripe-signature" }, { status: 400 });
  }

  let event;

  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook inválido",
      },
      { status: 400 },
    );
  }

  try {
    if (event.type === "payment_intent.amount_capturable_updated" || event.type === "payment_intent.succeeded") {
      await handlePaymentEvent(
        event.data.object as { id: string; metadata?: Record<string, string> },
        event.type === "payment_intent.succeeded",
      );
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as { metadata?: Record<string, string> };
      const paymentId = paymentIntent.metadata?.paymentId ?? "";
      if (paymentId) {
        await upsertPaymentStatus(paymentId, "fallido");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error procesando webhook",
      },
      { status: 500 },
    );
  }
}