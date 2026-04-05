import Link from "next/link";

import type { ChatMessage } from "@/lib/chat/types";
import { formatMoney } from "@/lib/stripe";

function paymentStatusLabel(status: string) {
  if (status === "pagado") return "En custodia";
  if (status === "liberado") return "Liberado";
  if (status === "incidencia_abierta") return "Incidencia abierta";
  if (status === "reembolso_total") return "Reembolsado";
  return "Solicitud enviada";
}

export function PaymentMessageCard({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const payload = (message.payload ?? {}) as {
    paymentId?: string;
    amount?: number;
    status?: string;
    paymentUrl?: string;
    note?: string;
  };

  const amount = Number(payload.amount ?? 0);
  const canPayNow = payload.status === "pendiente" || message.kind === "payment_request";

  return (
    <div className={`rounded-2xl border ${mine ? "border-[#FFD3D3] bg-[#FFF8F8]" : "border-[#FFE5E5] bg-white"} p-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)]`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10.5V20h14v-9.5" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-semibold text-[#1A1A1A]">Solicitud de pago del primer mes</p>
            <span className="rounded-full bg-[#FF6B6B]/10 px-2 py-1 text-[11px] font-bold text-[#FF6B6B]">
              {paymentStatusLabel(payload.status ?? message.kind)}
            </span>
          </div>

          <p className="mt-1 text-[24px] font-bold text-[#FF6B6B]">{formatMoney(amount)}</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">Pago seguro con custodia de 48h</p>
          {payload.note ? <p className="mt-2 text-[13px] text-[#4B5563]">{payload.note}</p> : null}

          {payload.paymentId && canPayNow ? (
            <Link
              href={payload.paymentUrl ?? `/payment/${payload.paymentId}`}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white transition active:scale-[0.99]"
            >
              Pagar ahora
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}