import { NextResponse } from "next/server";

import { createIncidentRecord, getPaymentRow, getUser, triggerPaymentUpdate, upsertPaymentStatus } from "@/lib/payments/service";
import { sendIncidentAlertEmail } from "@/lib/notifications/email";
import { uploadDataUrl } from "@/lib/storage/uploads";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://perfectos-desconocidos-5hgb.vercel.app";
}

type Payload = {
  paymentId?: string;
  descripcion?: string;
  fotosDataUrls?: string[];
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
  const paymentId = body.paymentId?.trim() ?? "";
  const descripcion = body.descripcion?.trim() ?? "";
  const fotosDataUrls = body.fotosDataUrls ?? [];

  if (!paymentId || !descripcion) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const payment = await getPaymentRow(paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (payment.inquilinoId !== user.id) {
    return NextResponse.json({ error: "Solo el inquilino puede reportar incidencias" }, { status: 403 });
  }

  if (payment.estado === "liberado") {
    return NextResponse.json({ error: "Este pago ya fue liberado" }, { status: 409 });
  }

  const ageHours = (Date.now() - new Date(payment.creadoEn).getTime()) / (1000 * 60 * 60);
  if (ageHours > 48) {
    return NextResponse.json({ error: "La ventana de 48h para incidencias ha expirado" }, { status: 409 });
  }

  const photos = await Promise.all(
    fotosDataUrls.slice(0, 3).map((photo, index) => uploadDataUrl(`incidencias/${paymentId}/${index + 1}.jpg`, photo)),
  );

  const incident = await createIncidentRecord({
    paymentId,
    descripcion,
    fotos: photos,
  });

  await upsertPaymentStatus(paymentId, "incidencia_abierta");

  const [owner, tenant] = await Promise.all([
    getUser(payment.propietarioId),
    getUser(payment.inquilinoId),
  ]);

  if (owner && tenant) {
    await sendIncidentAlertEmail({
      to: [process.env.PLATFORM_TEAM_EMAIL ?? "soporte@perfectosdesconocidos.com"],
      paymentId: payment.id,
      description: descripcion,
      tenantName: tenant.nombre,
      ownerName: owner.nombre,
      reviewUrl: `${getAppUrl()}/admin/incidencias/${incident.id}`,
    });
  }

  await triggerPaymentUpdate(
    {
      id: payment.id,
      matchId: payment.matchId,
      pisoId: payment.pisoId,
      cantidad: Number(payment.cantidad),
      estado: "incidencia_abierta",
      stripePaymentIntentId: payment.stripePaymentIntentId,
      liberadoEn: payment.liberadoEn,
      creadoEn: payment.creadoEn,
    },
    payment.matchId,
  );

  return NextResponse.json({ ok: true, incidentId: incident.id });
}