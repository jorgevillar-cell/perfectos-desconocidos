import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getMatch, getPaymentRow, getPiso, getUser } from "@/lib/payments/service";
import { formatMoney } from "@/lib/stripe";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ pagoId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { pagoId } = await params;
  const payment = await getPaymentRow(pagoId);
  if (!payment || (payment.inquilinoId !== user.id && payment.propietarioId !== user.id)) {
    notFound();
  }

  const [match, owner, tenant, piso] = await Promise.all([
    getMatch(payment.matchId),
    getUser(payment.propietarioId),
    getUser(payment.inquilinoId),
    payment.pisoId ? getPiso(payment.pisoId) : null,
  ]);

  const chatPartnerId = user.id === payment.inquilinoId ? payment.propietarioId : payment.inquilinoId;
  const releaseDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(new Date(payment.creadoEn).getTime() + 7 * 24 * 60 * 60 * 1000));

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-10 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
          <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-6 text-[32px] font-bold">¡Pago realizado con éxito!</h1>
        <p className="mt-2 text-[15px] text-[#6B7280]">El importe queda en custodia hasta su liberación automática.</p>

        <div className="mt-6 grid gap-4 rounded-[28px] border border-[#E5E7EB] bg-[#FAFAFA] p-5 text-left sm:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-[#6B7280]">Importe</p>
            <p className="mt-1 text-[24px] font-bold text-[#FF6B6B]">{formatMoney(Number(payment.cantidad))}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#6B7280]">Se libera el</p>
            <p className="mt-1 text-[18px] font-semibold text-[#1A1A1A]">{releaseDate}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#6B7280]">Propietario</p>
            <p className="mt-1 text-[16px] font-semibold text-[#1A1A1A]">{owner?.nombre ?? "Propietario"}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#6B7280]">Piso</p>
            <p className="mt-1 text-[16px] font-semibold text-[#1A1A1A]">{piso?.direccion ?? piso?.zona ?? "Dirección pendiente"}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/explore?chatWith=${chatPartnerId}&matchId=${match?.id ?? ""}`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6B6B] px-5 text-[14px] font-semibold text-white transition active:scale-[0.99]"
          >
            Volver al chat
          </Link>
          <Link
            href={`/api/pagos/${payment.id}/receipt`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-[14px] font-semibold text-[#4B5563] transition active:scale-[0.99]"
          >
            Descargar recibo PDF
          </Link>
        </div>

        <p className="mt-6 text-[13px] leading-6 text-[#6B7280]">
          El pago se liberará automáticamente a los 7 días si no se registra ninguna incidencia.
        </p>
        {tenant ? <p className="mt-2 text-[13px] text-[#9CA3AF]">Inquilino: {tenant.nombre}</p> : null}
      </div>
    </main>
  );
}