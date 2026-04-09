"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RequestContactButtonProps = {
  profileId: string;
  profileName: string;
  profilePhotoUrl: string | null;
  compatibility: number;
  isAuthenticated: boolean;
  disabled?: boolean;
  autoOpen?: boolean;
  className?: string;
  buttonLabel?: string;
};

export function RequestContactButton({
  profileId,
  profileName,
  profilePhotoUrl,
  compatibility,
  isAuthenticated,
  disabled = false,
  autoOpen = false,
  className = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F76565] px-4 text-[15px] font-semibold text-white transition hover:bg-[#ef5858]",
  buttonLabel = "Enviar solicitud",
}: RequestContactButtonProps) {
  const router = useRouter();
  const [isComposerOpen, setIsComposerOpen] = useState(autoOpen);
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function submitRequest() {
    if (disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/matches/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId,
          message,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        estado?: string;
        matchId?: string;
        matchConfirmado?: boolean;
        compatibility?: number | null;
        otherUserName?: string | null;
        otherUserPhoto?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo enviar la solicitud");
      }

      if (payload.matchConfirmado && payload.matchId) {
        const params = new URLSearchParams({
          chatWith: profileId,
          celebrate: "1",
          matchId: payload.matchId,
          matchName: payload.otherUserName ?? profileName,
          matchPhoto: payload.otherUserPhoto ?? profilePhotoUrl ?? "",
          compatibility: String(payload.compatibility ?? compatibility),
        });

        router.push(`/explore?${params.toString()}`);
        return;
      }

      setFeedback("Solicitud enviada con tu mensaje. Te avisaremos cuando responda.");
      setIsComposerOpen(false);
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || isSubmitting}
        onClick={() => {
          if (!isAuthenticated) {
            setIsAuthRequiredOpen(true);
            return;
          }
          setFeedback("");
          setIsComposerOpen(true);
        }}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {buttonLabel}
      </button>

      {feedback ? (
        <p className="mt-3 rounded-xl border border-[#F3D3CD] bg-[#FFF8F5] px-3 py-2 text-[13px] font-semibold text-[#B35C52]">{feedback}</p>
      ) : null}

      {isAuthRequiredOpen ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-[#F0D8D3] bg-[#FFF8F5] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B35C52]">Necesitas cuenta</p>
                <h2 className="mt-2 text-[22px] font-semibold text-[#1F2937]">Crea tu cuenta para solicitar contacto</h2>
                <p className="mt-1 text-[14px] leading-6 text-[#6B7280]">Para enviar solicitudes tienes que iniciar sesion.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthRequiredOpen(false)}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4B5563]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="min-h-12 rounded-2xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="min-h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-[15px] font-semibold text-[#4B5563]"
              >
                Iniciar sesion
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isComposerOpen ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-[#F0D8D3] bg-[#FFF8F5] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B35C52]">Solicitar contacto</p>
                <h2 className="mt-2 text-[22px] font-semibold text-[#1F2937]">Escribe tu mensaje de solicitud</h2>
                <p className="mt-1 text-[14px] leading-6 text-[#6B7280]">{profileName} recibira este mensaje y podra aceptarlo o rechazarlo.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4B5563]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#F3DDD6] bg-white p-4">
              <label htmlFor="contact-message" className="text-[13px] font-semibold text-[#374151]">
                Mensaje
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={300}
                rows={5}
                placeholder="Hola! Me interesa tu perfil y me gustaria hablar contigo."
                className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#FFFCFB] px-4 py-3 text-[15px] leading-6 text-[#111827] outline-none transition focus:border-[#FF6B6B] focus:ring-4 focus:ring-[#FF6B6B]/10"
              />
              <div className="mt-2 flex items-center justify-between text-[12px] text-[#94A3B8]">
                <span>Maximo 300 caracteres</span>
                <span>{message.length}/300</span>
              </div>
            </div>

            {error ? <p className="mt-3 text-[13px] font-semibold text-[#B42318]">{error}</p> : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="min-h-12 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-[15px] font-semibold text-[#4B5563]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitRequest}
                className="min-h-12 flex-1 rounded-2xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
