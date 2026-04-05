"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProfileActionsProps = {
  profileId: string;
  disabled: boolean;
  profileName: string;
  profilePhotoUrl: string | null;
  compatibility: number;
};

export function ProfileActions({ profileId, disabled, profileName, profilePhotoUrl, compatibility }: ProfileActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [matchCelebration, setMatchCelebration] = useState<{
    matchId: string;
    profileName: string;
    profilePhotoUrl: string | null;
    compatibility: number;
  } | null>(null);

  async function handleLike() {
    if (disabled || isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/matches/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        matchId?: string;
        matchConfirmado?: boolean;
        compatibility?: number | null;
        otherUserName?: string | null;
        otherUserPhoto?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo registrar el like");
      }

      if (payload.matchConfirmado) {
        setMatchCelebration({
          matchId: payload.matchId ?? "",
          profileName: payload.otherUserName ?? profileName,
          profilePhotoUrl: payload.otherUserPhoto ?? profilePhotoUrl,
          compatibility: payload.compatibility ?? compatibility,
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/96 px-4 pb-4 pt-3 backdrop-blur sm:px-6">
        {error ? <p className="mb-2 text-[14px] font-normal text-[#B91C1C]">{error}</p> : null}

        <div className="mx-auto flex max-w-4xl gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-14 flex-1 rounded-xl border border-[#D1D5DB] bg-[#F3F4F6] px-4 text-[16px] font-semibold text-[#4B5563] transition active:scale-[0.98]"
          >
            Pasar
          </button>
          <button
            type="button"
            disabled={disabled || isSubmitting}
            onClick={handleLike}
            className="min-h-14 flex-1 rounded-xl bg-[#FF6B6B] px-4 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Enviando..." : "Me interesa"}
          </button>
        </div>
      </div>

      {matchCelebration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFE6E6] via-[#FFF4F4] to-[#FFEDEA] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/85 p-6 text-center backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
            <div className="relative mx-auto mb-4 h-24 w-44">
              <div className="absolute left-8 top-0 h-24 w-24 animate-[pulse_2s_ease-in-out_infinite] overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img src="https://i.pravatar.cc/160?img=64" alt="Tu perfil" className="h-full w-full object-cover" />
              </div>
              <div className="absolute right-8 top-0 h-24 w-24 animate-[pulse_2s_ease-in-out_infinite_150ms] overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img
                  src={matchCelebration.profilePhotoUrl ?? "https://i.pravatar.cc/160?img=12"}
                  alt={matchCelebration.profileName}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <p className="text-[36px] font-bold text-[#FF6B6B]">Es un match!</p>
            <p className="mt-1 text-[18px] font-semibold text-[#1A1A1A]">{matchCelebration.profileName}</p>
            <p className="mt-1 text-[14px] text-[#6B7280]">{matchCelebration.compatibility}% de compatibilidad</p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    chatWith: profileId,
                    celebrate: "1",
                    matchId: matchCelebration.matchId,
                    matchName: matchCelebration.profileName,
                    matchPhoto: matchCelebration.profilePhotoUrl ?? "",
                    compatibility: String(matchCelebration.compatibility),
                  });

                  router.push(`/explore?${params.toString()}`);
                }}
                className="min-h-12 rounded-xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white transition active:scale-[0.99]"
              >
                Enviar mensaje
              </button>
              <button
                type="button"
                onClick={() => setMatchCelebration(null)}
                className="min-h-12 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[15px] font-semibold text-[#4B5563] transition active:scale-[0.99]"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
