import { NextResponse } from "next/server";

import { createPaymentStatusMessage, getPaymentRow, getUser, settlePayment, triggerPaymentUpdate } from "@/lib/payments/service";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type Payload = {
  incidentId?: string;
  resolution?: "liberar" | "reembolso_total";
  adminToken?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;
  const incidentId = body.incidentId?.trim() ?? "";
  const resolution = body.resolution;

  if (!incidentId || !resolution) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const expectedToken = process.env.PLATFORM_ADMIN_TOKEN;
  if (expectedToken && body.adminToken !== expectedToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user && !expectedToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: incident, error: incidentError } = await supabase
    .from("incidencias")
    .select("id,pagoId,descripcion,estado,fotos,resolucion,resueltaEn,creadoEn")
    .eq("id", incidentId)
    .maybeSingle<{ id: string; pagoId: string }>();

  if (incidentError || !incident) {
    return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
  }

  const payment = await getPaymentRow(incident.pagoId);
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (resolution === "liberar") {
    const settled = await settlePayment(payment.id);
    await supabase
      .from("incidencias")
      .update({ estado: "resuelta_propietario", resolucion: "liberar", resueltaEn: new Date().toISOString() })
      .eq("id", incidentId);

    await triggerPaymentUpdate(settled, payment.matchId);

    await createPaymentStatusMessage({
      matchId: payment.matchId,
      senderId: payment.propietarioId,
      paymentId: payment.id,
      amount: settled.cantidad,
      status: "liberado",
      note: "La incidencia se ha resuelto a favor del propietario.",
    });

    return NextResponse.json({ ok: true, status: "liberado" });
  }

  if (payment.stripePaymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    if (intent.status === "requires_capture" || intent.status === "requires_payment_method") {
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    } else {
      await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    }
  }

  await supabase
    .from("pagos")
    .update({ estado: "reembolso_total" })
    .eq("id", payment.id);

  await supabase
    .from("incidencias")
    .update({ estado: "resuelta_inquilino", resolucion: "reembolso_total", resueltaEn: new Date().toISOString() })
    .eq("id", incidentId);

  const owner = await getUser(payment.propietarioId);
  const tenant = await getUser(payment.inquilinoId);
  if (owner && tenant) {
    await Promise.all([
      sendNotificationEmail({
        to: [owner.email, tenant.email],
        subject: "Incidencia resuelta con reembolso",
        html: `<p>La incidencia ${incidentId} se ha resuelto con reembolso total.</p>`,
      }).catch(() => undefined),
      createPaymentStatusMessage({
        matchId: payment.matchId,
        senderId: payment.inquilinoId,
        paymentId: payment.id,
        amount: Number(payment.cantidad),
        status: "reembolso_total",
        note: "La incidencia se ha resuelto con reembolso total.",
      }),
      triggerPaymentUpdate(
        {
          id: payment.id,
          matchId: payment.matchId,
          pisoId: payment.pisoId,
          cantidad: Number(payment.cantidad),
          estado: "reembolso_total",
          stripePaymentIntentId: payment.stripePaymentIntentId,
          liberadoEn: payment.liberadoEn,
          creadoEn: payment.creadoEn,
        },
        payment.matchId,
      ),
    ]);
  }

  return NextResponse.json({ ok: true, status: "reembolso_total" });
}