"use client";

import { useState } from "react";

export function ConnectBankAccountButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect/link", {
        method: "POST",
      });

      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "No se pudo iniciar Stripe Connect");
      }

      window.location.assign(payload.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6B6B] px-5 text-[14px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Abriendo Stripe..." : "Conectar cuenta bancaria para recibir pagos"}
      </button>
      {error ? <p className="mt-3 text-[13px] font-semibold text-[#B91C1C]">{error}</p> : null}
    </div>
  );
}