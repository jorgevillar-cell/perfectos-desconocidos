import { NextResponse } from "next/server";

import { createPaymentStatusMessage, getPaymentRow, getUser, sendPaymentEmails, triggerPaymentUpdate, upsertPaymentStatus } from "@/lib/payments/service";
import { stripe, stripeWebhookSecret } from "@/lib/stripe";

async function handlePaymentEvent(paymentIntent: { id: string; metadata?: Record<string, string> }) {
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

  const [buyer, owner] = await Promise.all([getUser(payment.inquilinoId), getUser(payment.propietarioId)]);

  await Promise.all([
    triggerPaymentUpdate(updated, payment.matchId),
    createPaymentStatusMessage({
      matchId: payment.matchId,
      senderId: payment.inquilinoId,
      paymentId: payment.id,
      amount: updated.cantidad,
      status: "pagado",
      note: "Pago confirmado. Queda en custodia 48h.",
    }),
    buyer && owner
      ? sendPaymentEmails({
          buyerEmail: buyer.email,
          ownerEmail: owner.email,
          subject: "Pago confirmado",
          payment: updated,
        })
      : Promise.resolve(),
  ]);
}

export async function POST(request: Request) {
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
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
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
      await handlePaymentEvent(event.data.object as { id: string; metadata?: Record<string, string> });
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