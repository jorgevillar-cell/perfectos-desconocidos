import { notFound, redirect } from "next/navigation";

import { PaymentCheckout } from "@/components/payments/payment-checkout";
import { getCurrentUser } from "@/lib/auth/session";
import { createPaymentIntentForPayment, getPaymentRow, getPiso, getUser } from "@/lib/payments/service";
import { formatMoney, getStripePublishableKey, getStripeSecretKey } from "@/lib/stripe";

export default async function PaymentPage({
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
  if (!payment) {
    notFound();
  }

  if (payment.estado !== "pendiente") {
    redirect(`/payment/success/${payment.id}`);
  }

  if (payment.inquilinoId !== user.id) {
    redirect(`/payment/success/${payment.id}`);
  }

  const [tenant, owner, piso, intent] = await Promise.all([
    getUser(payment.inquilinoId),
    getUser(payment.propietarioId),
    payment.pisoId ? getPiso(payment.pisoId) : null,
    createPaymentIntentForPayment(payment.id),
  ]);

  if (!tenant || !owner || !intent.clientSecret) {
    notFound();
  }

  const amount = Number(payment.cantidad);
  const stripeSecretKey = getStripeSecretKey();
  const stripePublishableKey = getStripePublishableKey();
  const pisoImage = piso?.fotos?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80";
  const releaseDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(new Date(payment.creadoEn).getTime() + 7 * 24 * 60 * 60 * 1000));
  const isTestMode = stripeSecretKey.startsWith("sk_test");

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-10 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {isTestMode ? (
          <div className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] font-semibold text-[#92400E]">
            Modo prueba activo. Usa la tarjeta 4242 4242 4242 4242 con cualquier fecha futura y cualquier CVC.
          </div>
        ) : null}

        <PaymentCheckout
          paymentId={payment.id}
          clientSecret={intent.clientSecret}
          publishableKey={stripePublishableKey}
          amount={amount}
          ownerName={owner.nombre}
          pisoTitle={piso?.direccion ?? piso?.zona ?? "Piso confirmado"}
          pisoAddress={piso?.direccion ?? piso?.zona ?? "Dirección pendiente"}
          pisoImage={pisoImage}
          ownerPayout={Math.round(amount * 0.9)}
          platformFee={Math.round(amount * 0.1)}
          releaseDate={releaseDate}
          isTestMode={isTestMode}
        />

        <div className="mt-6 flex items-center justify-between gap-4 text-[13px] text-[#6B7280]">
          <p>Importe mostrado: {formatMoney(amount)}</p>
          <p>Inquilino: {tenant.nombre}</p>
        </div>
      </div>
    </main>
  );
}