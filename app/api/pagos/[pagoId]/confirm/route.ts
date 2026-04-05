import { NextResponse } from "next/server";

import { createPaymentStatusMessage, getPaymentRow, getUser, sendPaymentEmails, triggerPaymentUpdate, upsertPaymentStatus } from "@/lib/payments/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Payload = {
  paymentIntentId?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ pagoId: string }> }) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { pagoId } = await params;
  const body = (await request.json().catch(() => ({}))) as Payload;
  const payment = await getPaymentRow(pagoId);

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (payment.inquilinoId !== user.id) {
    return NextResponse.json({ error: "Solo el inquilino puede confirmar este pago" }, { status: 403 });
  }

  if (payment.estado !== "pendiente" && payment.estado !== "autorizado") {
    return NextResponse.json({ ok: true, paymentId: payment.id, status: payment.estado });
  }

  const updated = await upsertPaymentStatus(payment.id, "pagado", {
    stripePaymentIntentId: body.paymentIntentId ?? payment.stripePaymentIntentId,
  });

  if (!updated) {
    return NextResponse.json({ error: "No se pudo actualizar el pago" }, { status: 500 });
  }

  const [buyer, owner] = await Promise.all([getUser(payment.inquilinoId), getUser(payment.propietarioId)]);

  await Promise.all([
    createPaymentStatusMessage({
      matchId: payment.matchId,
      senderId: payment.inquilinoId,
      paymentId: payment.id,
      amount: updated.cantidad,
      status: "pagado",
      note: "Pago realizado con éxito. Queda en custodia 48h.",
    }),
    triggerPaymentUpdate(updated, payment.matchId),
    buyer && owner
      ? sendPaymentEmails({
          buyerEmail: buyer.email,
          ownerEmail: owner.email,
          subject: "Pago confirmado",
          payment: updated,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, paymentId: payment.id, status: updated.estado });
}