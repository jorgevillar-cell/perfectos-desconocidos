"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { formatMoney } from "@/lib/stripe";

type PaymentRequestFormProps = {
  matchId: string;
  pisoId: string;
  defaultAmount: number;
  pisoLabel: string;
  onCancel: () => void;
  onCreated: (paymentId: string) => void;
};

export function PaymentRequestForm({
  matchId,
  pisoId,
  defaultAmount,
  pisoLabel,
  onCancel,
  onCreated,
}: PaymentRequestFormProps) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/pagos/solicitud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          pisoId,
          amount: Number(amount),
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; paymentId?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.paymentId) {
        throw new Error(payload.error ?? "No se pudo crear la solicitud");
      }

      onCreated(payload.paymentId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#FFE3E3] bg-[#FFF9F9] p-4 shadow-[0_8px_20px_rgba(255,107,107,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[#1A1A1A]">Solicitar pago del primer mes</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">{pisoLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#E5E7EB] bg-white px-2 py-1 text-[12px] font-semibold text-[#6B7280]"
        >
          Cerrar
        </button>
      </div>

      <label className="mt-3 block">
        <span className="text-[13px] font-semibold text-[#4B5563]">Importe</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min="1"
            step="1"
            className="w-full bg-transparent text-[14px] text-[#1A1A1A] outline-none"
          />
          <span className="text-[13px] font-semibold text-[#6B7280]">EUR</span>
        </div>
      </label>

      <p className="mt-2 text-[12px] text-[#9CA3AF]">Precio de referencia: {formatMoney(defaultAmount)}</p>

      {error ? <p className="mt-2 text-[13px] font-semibold text-[#B91C1C]">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Enviando..." : "Enviar solicitud de pago"}
        </button>
      </div>
    </form>
  );
}