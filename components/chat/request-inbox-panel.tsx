"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { RequestSummary, RequestsPayload } from "@/lib/matches/solicitudes";

type OpenChatPayload = {
  otherUserId: string;
  matchId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  compatibility: number;
};

type ContactRequestsPanelProps = {
  active: boolean;
  onOpenChat: (payload: OpenChatPayload) => void;
  onCountsChange: (pendingReceivedCount: number) => void;
};

type Tab = "received" | "sent";

const PANEL_SHADOW = "0 18px 50px rgba(15, 23, 42, 0.12)";

function withFallbackImage(url: string | null | undefined) {
  if (url?.trim()) {
    return url;
  }

  return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80";
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffHours < 48) return "hace 2 días";

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} días`;
}

function buildChatUrl(request: RequestSummary) {
  const params = new URLSearchParams({
    chatWith: request.otherUser.id,
    matchId: request.matchId,
    celebrate: "1",
    matchName: request.otherUser.nombre,
    matchPhoto: request.otherUser.fotoUrl ?? "",
    compatibility: String(request.compatibility),
  });

  return `/explore?${params.toString()}`;
}

function statusStyles(state: RequestSummary["estado"]) {
  if (state === "solicitud_aceptada") {
    return "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]";
  }

  if (state === "solicitud_rechazada") {
    return "border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280]";
  }

  return "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]";
}

function statusLabel(state: RequestSummary["estado"]) {
  if (state === "solicitud_aceptada") return "Aceptada";
  if (state === "solicitud_rechazada") return "Rechazada";
  return "Pendiente";
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{title}</h3>
      <span className="rounded-full bg-[#FFF1F1] px-2.5 py-1 text-[12px] font-semibold text-[#FF6B6B]">{count}</span>
    </div>
  );
}

function ReceivedCard({
  request,
  onAccept,
  onReject,
  submitting,
}: {
  request: RequestSummary;
  onAccept: (request: RequestSummary) => void;
  onReject: (request: RequestSummary) => void;
  submitting: boolean;
}) {
  const isPending = request.estado === "solicitud_pendiente";

  return (
    <article className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <img
          src={withFallbackImage(request.otherUser.fotoUrl)}
          alt={request.otherUser.nombre}
          className="h-12 w-12 flex-none rounded-full object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">
                {request.otherUser.nombre}, {request.otherUser.edad}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[#FF6B6B]">{request.compatibility}% de compatibilidad</p>
            </div>
            <span className="text-[12px] text-[#9CA3AF]">{formatRelativeTime(request.fechaSolicitud)}</span>
          </div>

          {request.mensajePresentacion ? (
            <div className="mt-3 rounded-2xl border border-[#F3F4F6] bg-[#FCFCFC] p-3 text-[14px] leading-6 text-[#4B5563]">
              {request.mensajePresentacion}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isPending ? (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onAccept(request)}
                  className="inline-flex min-h-10 items-center rounded-2xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white transition hover:bg-[#ff5b5b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onReject(request)}
                  className="inline-flex min-h-10 items-center rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 text-[14px] font-semibold text-[#4B5563] transition hover:bg-[#ECEEF2] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Rechazar
                </button>
              </>
            ) : (
              <span className={`inline-flex min-h-10 items-center rounded-2xl border px-4 text-[14px] font-semibold ${statusStyles(request.estado)}`}>
                {statusLabel(request.estado)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SentCard({ request }: { request: RequestSummary }) {
  const isAccepted = request.estado === "solicitud_aceptada";
  const isRejected = request.estado === "solicitud_rechazada";

  return (
    <article className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <img
          src={withFallbackImage(request.otherUser.fotoUrl)}
          alt={request.otherUser.nombre}
          className="h-12 w-12 flex-none rounded-full object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">{request.otherUser.nombre}</p>
              <p className="mt-1 text-[13px] text-[#9CA3AF]">{formatRelativeTime(request.fechaSolicitud)}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${statusStyles(request.estado)}`}>{statusLabel(request.estado)}</span>
          </div>

          {request.mensajePresentacion ? (
            <div className="mt-3 rounded-2xl border border-[#F3F4F6] bg-[#FCFCFC] p-3 text-[14px] leading-6 text-[#4B5563]">
              {request.mensajePresentacion}
            </div>
          ) : null}

          {isAccepted ? (
            <div className="mt-4">
              <Link
                href={buildChatUrl(request)}
                className="inline-flex min-h-10 items-center rounded-2xl bg-[#16A34A] px-4 text-[14px] font-semibold text-white transition hover:bg-[#15803D]"
              >
                Abrir chat
              </Link>
            </div>
          ) : isRejected ? null : null}
        </div>
      </div>
    </article>
  );
}

export function ContactRequestsPanel({ active, onOpenChat, onCountsChange }: ContactRequestsPanelProps) {
  const [tab, setTab] = useState<Tab>("received");
  const [payload, setPayload] = useState<RequestsPayload>({
    received: [],
    sent: [],
    pendingReceivedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const activeRequests = useMemo(() => (tab === "received" ? payload.received : payload.sent), [payload, tab]);

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/matches/solicitudes", {
        cache: "no-store",
      });

      const responsePayload = (await response.json()) as RequestsPayload & { error?: string };

      if (!response.ok) {
        throw new Error(responsePayload.error ?? "No se pudieron cargar las solicitudes");
      }

      setPayload({
        received: responsePayload.received ?? [],
        sent: responsePayload.sent ?? [],
        pendingReceivedCount: responsePayload.pendingReceivedCount ?? 0,
      });
      onCountsChange(responsePayload.pendingReceivedCount ?? 0);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  }, [onCountsChange]);

  useEffect(() => {
    if (!active) {
      return;
    }

    void loadRequests();
  }, [active, loadRequests]);

  async function handleAction(request: RequestSummary, action: "accept" | "reject") {
    if (submittingId) {
      return;
    }

    setSubmittingId(request.id);

    try {
      const response = await fetch(`/api/matches/solicitudes/${request.id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responsePayload = (await response.json()) as {
        ok?: boolean;
        estado?: string;
        matchId?: string;
        otherUserId?: string;
        otherUserName?: string;
        otherUserPhoto?: string | null;
        compatibility?: number;
        chatUrl?: string;
        error?: string;
      };

      if (!response.ok || !responsePayload.ok) {
        throw new Error(responsePayload.error ?? "No se pudo actualizar la solicitud");
      }

      setPayload((current) => ({
        ...current,
        received: current.received.map((item) =>
          item.id === request.id
            ? {
                ...item,
                estado: action === "accept" ? "solicitud_aceptada" : "solicitud_rechazada",
              }
            : item,
        ),
      }));

      await loadRequests();

      if (action === "accept" && responsePayload.otherUserId && responsePayload.matchId) {
        onOpenChat({
          otherUserId: responsePayload.otherUserId,
          matchId: responsePayload.matchId,
          otherUserName: responsePayload.otherUserName ?? request.otherUser.nombre,
          otherUserPhoto: responsePayload.otherUserPhoto ?? request.otherUser.fotoUrl,
          compatibility: responsePayload.compatibility ?? request.compatibility,
        });
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar la solicitud");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#E5E7EB] px-4 py-3">
        <p className="mb-3 text-[13px] text-[#6B7280]">Gestiona quién quiere hablar contigo y sigue el estado de tus solicitudes.</p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setTab("received")}
            className={`min-h-11 rounded-xl px-4 text-[14px] font-semibold transition ${tab === "received" ? "bg-white text-[#FF6B6B] shadow-[0_8px_18px_rgba(15,23,42,0.06)]" : "text-[#64748B]"}`}
          >
            Recibidas
          </button>
          <button
            type="button"
            onClick={() => setTab("sent")}
            className={`min-h-11 rounded-xl px-4 text-[14px] font-semibold transition ${tab === "sent" ? "bg-white text-[#FF6B6B] shadow-[0_8px_18px_rgba(15,23,42,0.06)]" : "text-[#64748B]"}`}
          >
            Enviadas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#FCFCFC] px-4 py-4">
        {error ? <p className="mb-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#B91C1C]">{error}</p> : null}

        {loading ? (
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-3xl bg-[#F3F4F6]" />
            <div className="h-28 animate-pulse rounded-3xl bg-[#F3F4F6]" />
          </div>
        ) : activeRequests.length ? (
          <div className="space-y-3">
            {tab === "received" ? (
              <SectionTitle title="Recibidas" count={payload.received.length} />
            ) : (
              <SectionTitle title="Enviadas" count={payload.sent.length} />
            )}

            {activeRequests.map((request) =>
              tab === "received" ? (
                <ReceivedCard
                  key={request.id}
                  request={request}
                  submitting={submittingId === request.id}
                  onAccept={(nextRequest) => void handleAction(nextRequest, "accept")}
                  onReject={(nextRequest) => void handleAction(nextRequest, "reject")}
                />
              ) : (
                <SentCard key={request.id} request={request} />
              ),
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 py-12 text-center">
            <div className="max-w-sm space-y-3">
              <p className="text-[18px] font-semibold text-[#1A1A1A]">Sin solicitudes</p>
              <p className="text-[14px] leading-6 text-[#6B7280]">
                {tab === "received"
                  ? "Cuando alguien te escriba, aparecerá aquí con su mensaje y podrás decidir si abrir el chat."
                  : "Aquí verás las solicitudes que has enviado y su estado actual."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}