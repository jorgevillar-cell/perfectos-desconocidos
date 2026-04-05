"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeCardElementOptions } from "@stripe/stripe-js";

import { formatMoney } from "@/lib/stripe";

type PaymentCheckoutProps = {
  paymentId: string;
  clientSecret: string;
  publishableKey: string;
  amount: number;
  ownerName: string;
  pisoTitle: string;
  pisoAddress: string;
  pisoImage: string;
  ownerPayout: number;
  platformFee: number;
  releaseDate: string;
  isTestMode: boolean;
};

const cardOptions: StripeCardElementOptions = {
  style: {
    base: {
      color: "#1A1A1A",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      iconColor: "#FF6B6B",
      "::placeholder": {
        color: "#9CA3AF",
      },
    },
    invalid: {
      color: "#B91C1C",
    },
  },
};

function PaymentCheckoutInner({
  paymentId,
  clientSecret,
  amount,
  ownerName,
  pisoTitle,
  pisoAddress,
  pisoImage,
  ownerPayout,
  platformFee,
  releaseDate,
  isTestMode,
}: Omit<PaymentCheckoutProps, "publishableKey">) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("No se pudo cargar el formulario de tarjeta");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const confirmation = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message ?? "No se pudo completar el pago");
      }

      if (!confirmation.paymentIntent) {
        throw new Error("Stripe no devolvió el pago");
      }

      const status = confirmation.paymentIntent.status;
      if (!["succeeded", "requires_capture"].includes(status)) {
        throw new Error(`Estado inesperado del pago: ${status}`);
      }

      const response = await fetch(`/api/pagos/${paymentId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentIntentId: confirmation.paymentIntent.id }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo confirmar el pago en la plataforma");
      }

      router.push(`/payment/success/${paymentId}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
        <div className="relative h-72 overflow-hidden">
          <img src={pisoImage} alt={pisoTitle} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[13px] uppercase tracking-[0.22em] text-white/75">Pago seguro</p>
            <h1 className="mt-2 text-[30px] font-bold leading-tight">{formatMoney(amount)}</h1>
            <p className="mt-1 text-[14px] text-white/85">Primer mes de alquiler en custodia</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FFF8F8] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12h20" />
                  <path d="M7 8V6a5 5 0 0 1 10 0v2" />
                  <rect x="4" y="8" width="16" height="12" rx="2" />
                </svg>
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#6B7280]">Pagas de forma segura</p>
              <p className="mt-2 text-[14px] text-[#4B5563]">Stripe procesa la tarjeta con un entorno protegido.</p>
            </div>
            <div className="rounded-2xl bg-[#FFF8F8] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="M4.93 19.07l2.83-2.83" />
                  <path d="M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#6B7280]">Tu dinero queda protegido 48h</p>
              <p className="mt-2 text-[14px] text-[#4B5563]">Si surge una incidencia, el pago se congela antes de la liberación.</p>
            </div>
            <div className="rounded-2xl bg-[#FFF8F8] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v20" />
                  <path d="M8 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7" />
                </svg>
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#6B7280]">El propietario recibe el dinero a los 7 días</p>
              <p className="mt-2 text-[14px] text-[#4B5563]">El sistema transfiere el 90% al propietario y el 10% a la plataforma.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#FFE0E0] bg-[#FFF9F9] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">Desglose de comisión</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">5% del inquilino + 5% del propietario = 10% total</p>
              </div>
              <div className="text-right">
                <p className="text-[14px] text-[#6B7280]">Propietario recibe</p>
                <p className="text-[18px] font-bold text-[#FF6B6B]">{formatMoney(ownerPayout)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-[13px] text-[#4B5563] sm:grid-cols-2">
              <div className="rounded-xl bg-white px-3 py-2">Comisión estimada plataforma: {formatMoney(platformFee)}</div>
              <div className="rounded-xl bg-white px-3 py-2">Fecha de liberación: {releaseDate}</div>
            </div>
          </div>
        </div>
      </section>

      <aside className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#FF6B6B]">Resumen</p>
        <h2 className="mt-2 text-[24px] font-bold text-[#1A1A1A]">{pisoTitle}</h2>
        <p className="mt-1 text-[14px] text-[#6B7280]">{pisoAddress}</p>
        <p className="mt-1 text-[14px] text-[#6B7280]">Propietario: {ownerName}</p>

        {isTestMode ? (
          <div className="mt-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] font-semibold text-[#92400E]">
            Modo prueba activo. Usa 4242 4242 4242 4242 con cualquier fecha futura y cualquier CVC.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] px-4 py-4">
            <CardElement options={cardOptions} />
          </div>

          {error ? <p className="text-[13px] font-semibold text-[#B91C1C]">{error}</p> : null}

          <button
            type="submit"
            disabled={!stripe || !elements || isSubmitting}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Procesando..." : `Pagar ${formatMoney(amount)} de forma segura`}
          </button>
        </form>

        <p className="mt-4 text-[12px] leading-5 text-[#9CA3AF]">
          Al pagar aceptas que el importe quede retenido durante el periodo de custodia de la plataforma.
        </p>
      </aside>
    </div>
  );
}

export function PaymentCheckout(props: PaymentCheckoutProps) {
  const stripePromise = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
      }}
    >
      <PaymentCheckoutInner {...props} />
    </Elements>
  );
}