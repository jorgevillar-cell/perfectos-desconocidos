import { NextResponse } from "next/server";

import { listPaymentsReadyToSettle, settlePayment } from "@/lib/payments/service";

export async function GET(request: Request) {
  const expectedSecret = process.env.STRIPE_SETTLE_SECRET;
  if (expectedSecret) {
    const provided = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const payments = await listPaymentsReadyToSettle();
  const settled: string[] = [];

  for (const payment of payments) {
    await settlePayment(payment.id);
    settled.push(payment.id);
  }

  return NextResponse.json({ ok: true, settledCount: settled.length, settled });
}