"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { PaymentMessageCard } from "@/components/chat/payment-message-card";
import { logoutAction } from "@/lib/auth/actions";
import { getPusherClient } from "@/lib/chat/pusher-client";
import type { ChatMessage, ConversationSummary, MatchCelebrationPayload } from "@/lib/chat/types";
import { ContactRequestsPanel } from "@/components/chat/request-inbox-panel";
import { ProfileWelcomePanel } from "@/components/chat/profile-welcome-panel";
import { SavedProfilesPanel } from "@/components/chat/saved-profiles-panel";
import { OnboardingEditPanel } from "@/components/onboarding/onboarding-edit-panel";
import type { PaymentSummary } from "@/lib/payments/types";
import { SAVED_PROFILES_STORAGE_KEY, SAVED_PROFILES_UPDATED_EVENT } from "@/lib/saved-profiles";

type ActivePanel = "profile" | "chat" | "requests" | "saved" | "notifications" | "settings" | "onboarding-edit" | null;

type ChatDockProps = {
  isAuthenticated?: boolean;
  currentUserId: string;
  currentUserName: string;
  openChatWithUserId?: string | null;
  initialCelebration?: MatchCelebrationPayload | null;
};

type ToastItem = {
  id: number;
  message: string;
};

const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.08)";

function withFallbackImage(url: string | null | undefined) {
  if (url?.trim()) {
    return url;
  }

  return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80";
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
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
  if (diffHours < 48) return "ayer";

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} dias`;
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function IconButton({
  active,
  badge,
  onClick,
  children,
}: {
  active: boolean;
  badge?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
        active
          ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
          : "border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F8F8F8]"
      }`}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B6B] px-1 text-[11px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function MobileDockButton({
  active,
  badge,
  label,
  onClick,
  children,
}: {
  active: boolean;
  badge?: number;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="relative flex w-[68px] flex-col items-center gap-1.5">
      <span
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
          active
            ? "border-[#ff7f7f] bg-[linear-gradient(160deg,#FFE4E4_0%,#FFD2D2_100%)] text-[#E45A5A] shadow-[0_10px_22px_rgba(255,107,107,0.28)]"
            : "border-[#E6EAF0] bg-[linear-gradient(160deg,#F8FBFF_0%,#EEF4FF_100%)] text-[#667085]"
        }`}
      >
        {children}
        {badge && badge > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B6B] px-1 text-[11px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className={`text-[11px] font-semibold ${active ? "text-[#1F2937]" : "text-[#7A8494]"}`}>{label}</span>
    </button>
  );
}

export function ChatDock({
  isAuthenticated = true,
  currentUserId,
  currentUserName,
  openChatWithUserId,
  initialCelebration,
}: ChatDockProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  // New: onboarding edit panel
  const [showOnboardingEdit, setShowOnboardingEdit] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [messagesByMatch, setMessagesByMatch] = useState<Record<string, ChatMessage[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [requestBadgeCount, setRequestBadgeCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [typingByMatch, setTypingByMatch] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [celebration, setCelebration] = useState<MatchCelebrationPayload | null>(initialCelebration ?? null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [isGuestMenuOpen, setIsGuestMenuOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const messagesWrapRef = useRef<HTMLDivElement | null>(null);
  const typingDebounceRef = useRef<number | null>(null);
  const typingStopRef = useRef<number | null>(null);
  const readInFlightRef = useRef<Set<string>>(new Set());
  const requestedFromExploreRef = useRef<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const avatarLabel = initialsFromName(currentUserName || "U");

  const activeConversation = useMemo(
    () => conversations.find((item) => item.matchId === activeMatchId) ?? null,
    [activeMatchId, conversations],
  );

  const activeMessages = useMemo(() => {
    if (!activeMatchId) return [];
    return messagesByMatch[activeMatchId] ?? [];
  }, [activeMatchId, messagesByMatch]);

  const messageVirtualization = useMemo(() => {
    if (activeMessages.length <= 100) {
      return {
        topSpacer: 0,
        visible: activeMessages,
      };
    }

    const visible = activeMessages.slice(-120);
    return {
      topSpacer: (activeMessages.length - visible.length) * 74,
      visible,
    };
  }, [activeMessages]);

  const showMobileChatOnly = isMobile && !!activeConversation;
  const pushToast = useCallback((message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <aside
          onClick={() => {
            if (!isGuestMenuOpen) {
              setIsGuestMenuOpen(true);
            }
          }}
          className={`fixed right-0 top-0 z-40 hidden h-screen border-l border-[#E5E7EB] bg-white transition-all duration-200 sm:block ${
            isGuestMenuOpen ? "w-[250px]" : "w-16"
          }`}
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex h-full flex-col items-center py-4">
            <button
              type="button"
              onClick={() => setIsGuestMenuOpen((prev) => !prev)}
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] text-[#6B7280] transition hover:bg-[#F8F8F8]"
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>

            {isGuestMenuOpen ? (
              <div className="mt-4 w-full px-3">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">Menu</p>
                <div className="mt-2 space-y-2">
                  <Link
                    href="/login"
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px] font-semibold text-[#4B5563] transition hover:bg-[#F8FAFC]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                      <path d="M21 3v18" />
                    </svg>
                    Iniciar sesion
                  </Link>

                  <Link
                    href="/register"
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#FFD3D3] bg-[#FFF1F1] px-3 text-[14px] font-semibold text-[#B35C52] transition hover:bg-[#FFE8E8]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M6 19c0-2.8 2.4-5 6-5s6 2.2 6 5" />
                      <path d="M19 7v4" />
                      <path d="M17 9h4" />
                    </svg>
                    Crear cuenta
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <nav className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:hidden">
          <div
            className="flex items-end gap-1.5 rounded-[26px] border border-[#E6EAF0] bg-white/92 px-2.5 py-2 backdrop-blur"
            style={{ boxShadow: "0 14px 38px rgba(15,23,42,0.16)" }}
          >
            <Link href="/login" className="flex w-[68px] flex-col items-center gap-1.5">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6EAF0] bg-[linear-gradient(160deg,#F8FBFF_0%,#EEF4FF_100%)] text-[#667085]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M21 3v18" />
                </svg>
              </span>
              <span className="text-[11px] font-semibold text-[#7A8494]">Entrar</span>
            </Link>

            <Link href="/register" className="flex w-[68px] flex-col items-center gap-1.5">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFD3D3] bg-[linear-gradient(160deg,#FFF1F1_0%,#FFE4E4_100%)] text-[#E45A5A]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M6 19c0-2.8 2.4-5 6-5s6 2.2 6 5" />
                  <path d="M19 7v4" />
                  <path d="M17 9h4" />
                </svg>
              </span>
              <span className="text-[11px] font-semibold text-[#7A8494]">Registro</span>
            </Link>
          </div>
        </nav>
      </>
    );
  }

  const markAsRead = useCallback(
    async (matchId: string) => {
      if (readInFlightRef.current.has(matchId)) {
        return;
      }

      readInFlightRef.current.add(matchId);

      try {
        await fetch(`/api/chat/read/${matchId}`, { method: "POST" });
        setConversations((prev) => {
          const before = prev.find((item) => item.matchId === matchId)?.unreadCount ?? 0;
          setUnreadTotal((current) => Math.max(0, current - before));
          return prev.map((item) =>
            item.matchId === matchId
              ? {
                  ...item,
                  unreadCount: 0,
                }
              : item,
          );
        });
      } catch {
        pushToast("No se pudieron marcar los mensajes como leidos");
      } finally {
        readInFlightRef.current.delete(matchId);
      }
    },
    [pushToast],
  );

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) {
      return null;
    }

    setLoadingConversations(true);

    try {
      const response = await fetch("/api/chat/conversations", {
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        conversations?: ConversationSummary[];
        unreadTotal?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar las conversaciones");
      }

      const nextConversations = payload.conversations ?? [];
      setConversations(nextConversations);
      setUnreadTotal(payload.unreadTotal ?? 0);

      if (openChatWithUserId) {
        const target = nextConversations.find((item) => item.otherUserId === openChatWithUserId);
        if (target) {
          setActivePanel("chat");
          setActiveMatchId(target.matchId);
        }
      }

      if (!activeMatchId && nextConversations.length) {
        setActiveMatchId(nextConversations[0].matchId);
      }

      return nextConversations;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudieron cargar las conversaciones");
      return null;
    } finally {
      setLoadingConversations(false);
    }
  }, [activeMatchId, isAuthenticated, openChatWithUserId, pushToast]);

  const loadRequestBadge = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await fetch("/api/matches/solicitudes", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { pendingReceivedCount?: number };
      setRequestBadgeCount(payload.pendingReceivedCount ?? 0);
    } catch {
      return;
    }
  }, [isAuthenticated]);

  const ensureConversationOrRequest = useCallback(
    async (targetUserId: string) => {
      if (!isAuthenticated || !targetUserId) {
        return;
      }

      const existing = conversations.find((item) => item.otherUserId === targetUserId);
      if (existing) {
        setActivePanel("chat");
        setActiveMatchId(existing.matchId);
        return;
      }

      if (requestedFromExploreRef.current.has(targetUserId)) {
        return;
      }

      requestedFromExploreRef.current.add(targetUserId);

      try {
        const response = await fetch("/api/matches/like", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileId: targetUserId,
            message: "Hola! Me interesa tu perfil y me gustaria hablar contigo.",
          }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          matchConfirmado?: boolean;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "No se pudo enviar la solicitud de contacto");
        }

        if (payload.matchConfirmado) {
          const refreshed = await loadConversations();
          const targetConversation = refreshed?.find((item) => item.otherUserId === targetUserId) ?? null;

          if (targetConversation) {
            setActivePanel("chat");
            setActiveMatchId(targetConversation.matchId);
          }

          pushToast("Contacto desbloqueado. Ya puedes escribir.");
          return;
        }

        setActivePanel("requests");
        void loadRequestBadge();
        pushToast("Solicitud enviada. Te avisaremos cuando responda.");
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "No se pudo enviar la solicitud de contacto");
      }
    },
    [conversations, isAuthenticated, loadConversations, loadRequestBadge, pushToast],
  );

  const handleRequestCountChange = useCallback((count: number) => {
    setRequestBadgeCount(count);
  }, []);

  useEffect(() => {
    function readSavedCount() {
      try {
        const raw = localStorage.getItem(SAVED_PROFILES_STORAGE_KEY);
        if (!raw) {
          setSavedCount(0);
          return;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          setSavedCount(0);
          return;
        }

        setSavedCount(parsed.length);
      } catch {
        setSavedCount(0);
      }
    }

    readSavedCount();
    window.addEventListener(SAVED_PROFILES_UPDATED_EVENT, readSavedCount);
    window.addEventListener("storage", readSavedCount);

    return () => {
      window.removeEventListener(SAVED_PROFILES_UPDATED_EVENT, readSavedCount);
      window.removeEventListener("storage", readSavedCount);
    };
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la cuenta");
      }

      window.location.assign(response.url || "/login");
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : "No se pudo eliminar la cuenta");
    } finally {
      setIsDeletingAccount(false);
    }
  }, [isDeletingAccount]);

  const openChatFromRequest = useCallback(
    async ({
      otherUserId,
      matchId,
    }: {
      otherUserId: string;
      matchId: string;
      otherUserName: string;
      otherUserPhoto: string | null;
      compatibility: number;
    }) => {
      const nextConversations = await loadConversations();
      const conversation = nextConversations?.find((item) => item.otherUserId === otherUserId) ?? null;
      setActivePanel("chat");
      setActiveMatchId(conversation?.matchId ?? matchId ?? null);
    },
    [loadConversations],
  );

  const loadMessages = useCallback(
    async (matchId: string) => {
      setLoadingMessages(true);

      try {
        const response = await fetch(`/api/chat/messages/${matchId}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo cargar el historial");
        }

        setMessagesByMatch((prev) => ({
          ...prev,
          [matchId]: payload.messages ?? [],
        }));
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "No se pudo cargar el historial");
      } finally {
        setLoadingMessages(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadConversations();
  }, [isAuthenticated, loadConversations]);

  useEffect(() => {
    if (!isAuthenticated || !openChatWithUserId) {
      return;
    }

    const existing = conversations.find((item) => item.otherUserId === openChatWithUserId);
    if (existing) {
      setActivePanel("chat");
      setActiveMatchId(existing.matchId);
      return;
    }

    void ensureConversationOrRequest(openChatWithUserId);
  }, [conversations, ensureConversationOrRequest, isAuthenticated, openChatWithUserId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadRequestBadge();
  }, [isAuthenticated, loadRequestBadge]);

  useEffect(() => {
    if (!activeMatchId || !activePanel || activePanel !== "chat") {
      return;
    }

    void loadMessages(activeMatchId);
    void markAsRead(activeMatchId);
  }, [activeMatchId, activePanel, loadMessages, markAsRead]);

  useEffect(() => {
    if (!activeMessages.length) {
      return;
    }

    messagesWrapRef.current?.scrollTo({ top: messagesWrapRef.current.scrollHeight, behavior: "smooth" });
  }, [activeMessages.length, activeMatchId]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const node = event.target as Node;
      const insidePanel = !!panelRef.current?.contains(node);
      const insideSidebar = !!sidebarRef.current?.contains(node);

      if (!insidePanel && !insideSidebar) {
        setActivePanel(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [activePanel]);

  useEffect(() => {
    const pusher = getPusherClient();
    const userChannel = pusher.subscribe(`user-${currentUserId}`);

    const onMatchConfirmed = (payload: MatchCelebrationPayload) => {
      setCelebration(payload);
      setActivePanel("chat");
      void loadConversations();
    };

    userChannel.bind("match-confirmado", onMatchConfirmed);

    return () => {
      userChannel.unbind("match-confirmado", onMatchConfirmed);
      pusher.unsubscribe(`user-${currentUserId}`);
    };
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    if (!conversations.length) {
      return;
    }

    const pusher = getPusherClient();
    const channels = conversations.map((item) => pusher.subscribe(`chat-${item.matchId}`));

    channels.forEach((channel, index) => {
      const matchId = conversations[index].matchId;

      channel.bind("nuevo-mensaje", (incoming: ChatMessage) => {
        setMessagesByMatch((prev) => {
          const current = prev[matchId] ?? [];
          if (current.some((item) => item.id === incoming.id)) {
            return prev;
          }

          return {
            ...prev,
            [matchId]: [...current, incoming],
          };
        });

        setConversations((prev) => {
          const updated = prev.map((item) => {
            if (item.matchId !== matchId) {
              return item;
            }

            const unreadPlus = incoming.senderId !== currentUserId && matchId !== activeMatchId ? 1 : 0;
            return {
              ...item,
              unreadCount: item.unreadCount + unreadPlus,
              lastMessage: {
                id: incoming.id,
                content: incoming.content,
                kind: incoming.kind,
                payload: incoming.payload,
                createdAt: incoming.createdAt,
                senderId: incoming.senderId,
              },
            };
          });

          return [...updated].sort((a, b) => {
            const aTime = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
            const bTime = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
            return bTime - aTime;
          });
        });

        if (incoming.senderId !== currentUserId && matchId === activeMatchId) {
          void markAsRead(matchId);
        }

        if (incoming.senderId !== currentUserId && matchId !== activeMatchId) {
          setUnreadTotal((prev) => prev + 1);
        }
      });

      channel.bind("escribiendo", (payload: { userId: string; isTyping: boolean }) => {
        if (payload.userId === currentUserId) {
          return;
        }

        setTypingByMatch((prev) => ({
          ...prev,
          [matchId]: payload.isTyping,
        }));

        if (payload.isTyping) {
          window.setTimeout(() => {
            setTypingByMatch((prev) => ({
              ...prev,
              [matchId]: false,
            }));
          }, 1500);
        }
      });

      channel.bind("mensajes-leidos", (payload: { readerId: string }) => {
        if (payload.readerId === currentUserId) {
          return;
        }

        setMessagesByMatch((prev) => {
          const current = prev[matchId] ?? [];
          return {
            ...prev,
            [matchId]: current.map((item) =>
              item.senderId === currentUserId
                ? {
                    ...item,
                    read: true,
                  }
                : item,
            ),
          };
        });
      });

      channel.bind(
        "pago-actualizado",
        (payload: { payment: PaymentSummary; amountLabel: string; ownerPayout: string; platformFee: string }) => {
          setConversations((prev) =>
            prev.map((item) =>
              item.matchId === matchId
                ? {
                    ...item,
                    latestPayment: payload.payment,
                  }
                : item,
            ),
          );
        },
      );
    });

    return () => {
      channels.forEach((channel, index) => {
        const matchId = conversations[index].matchId;
        channel.unbind_all();
        pusher.unsubscribe(`chat-${matchId}`);
      });
    };
  }, [activeMatchId, conversations, currentUserId, markAsRead]);

  useEffect(() => {
    if (!conversations.length) {
      return;
    }

    const stored = localStorage.getItem("seen-match-celebrations");
    const seen = new Set<string>(stored ? (JSON.parse(stored) as string[]) : []);

    const unseen = conversations.find((item) => !item.lastMessage && !seen.has(item.matchId));
    if (!unseen) {
      return;
    }

    setCelebration({
      matchId: unseen.matchId,
      otherUserId: unseen.otherUserId,
      otherUserName: unseen.otherUserName,
      otherUserPhoto: unseen.otherUserPhoto,
      compatibility: unseen.compatibility,
    });

    seen.add(unseen.matchId);
    localStorage.setItem("seen-match-celebrations", JSON.stringify(Array.from(seen)));
  }, [conversations]);

  async function handleSendMessage() {
    if (!activeConversation || !draft.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: activeConversation.matchId,
          content: draft.trim(),
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo enviar el mensaje");
      }

      setDraft("");
      if (typingDebounceRef.current) {
        window.clearTimeout(typingDebounceRef.current);
      }
      if (typingStopRef.current) {
        window.clearTimeout(typingStopRef.current);
      }
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: activeConversation.matchId,
          isTyping: false,
        }),
      });
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!activeConversation) {
      return;
    }

    if (typingDebounceRef.current) {
      window.clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = window.setTimeout(() => {
      void fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: activeConversation.matchId,
          isTyping: value.trim().length > 0,
        }),
      });
    }, 250);

    if (typingStopRef.current) {
      window.clearTimeout(typingStopRef.current);
    }

    typingStopRef.current = window.setTimeout(() => {
      void fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: activeConversation.matchId,
          isTyping: false,
        }),
      });
    }, 1000);
  }

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel(panel);
  }

  function closePanel() {
    setActivePanel(null);
  }

  function onSelectConversation(matchId: string) {
    setActiveMatchId(matchId);
    if (isMobile) {
      setActivePanel("chat");
    }
    void markAsRead(matchId);
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        onClick={() => {
          if (!activePanel) {
            setActivePanel("profile");
          }
        }}
        className="fixed right-0 top-0 z-40 flex h-screen w-16 flex-col items-center justify-start gap-6 border-l border-[#E5E7EB] bg-white pt-20 max-sm:hidden"
        style={{ boxShadow: "-6px 0 24px rgba(0,0,0,0.08)", marginTop: 24 }}
      >
        <div className="flex flex-1 flex-col items-center gap-6">
          {/* Perfil */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => togglePanel("profile")}
              className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border text-[15px] font-bold transition ${
                activePanel === "profile"
                  ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                  : "border-[#E5E7EB] bg-[#FFF5F5] text-[#FF6B6B] hover:border-[#FF6B6B]/35"
              }`}
              aria-label="Perfil"
            >
              {avatarLabel || "U"}
            </button>
            <span className="text-[11px] text-[#7A8494] mt-1">Perfil</span>
          </div>

          {/* Chat */}
          <div className="flex flex-col items-center">
            <IconButton active={activePanel === "chat"} badge={unreadTotal} onClick={() => togglePanel("chat")}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16v10H8l-4 3V6Z" />
                <path d="M8 10h8" />
              </svg>
            </IconButton>
            <span className="text-[11px] text-[#7A8494] mt-1">Chat</span>
          </div>

          {/* Guardados */}
          <div className="flex flex-col items-center">
            <IconButton active={activePanel === "saved"} badge={savedCount} onClick={() => togglePanel("saved")}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4h12v16l-6-3-6 3V4Z" />
              </svg>
            </IconButton>
            <span className="text-[11px] text-[#7A8494] mt-1">Guardados</span>
          </div>

          {/* Editar perfil */}
          <div className="flex flex-col items-center">
            <IconButton active={activePanel === "onboarding-edit"} onClick={() => togglePanel("onboarding-edit")}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z" />
              </svg>
            </IconButton>
            <span className="text-[11px] text-[#7A8494] mt-1">Editar perfil</span>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-10 flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-[#6B7280] transition hover:border-[#E5E7EB] hover:bg-[#F8F8F8]"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M21 3v18" />
            </svg>
          </button>
        </div>
      </aside>

      <nav
        className={`fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:hidden ${
          activePanel ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
        }`}
      >
        <div
          className="flex items-end gap-1.5 rounded-[26px] border border-[#E6EAF0] bg-white/92 px-2.5 py-2 backdrop-blur"
          style={{ boxShadow: "0 14px 38px rgba(15,23,42,0.16)" }}
        >
          <MobileDockButton active={activePanel === "chat"} badge={unreadTotal} label="Mensajes" onClick={() => togglePanel("chat")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16v10H8l-4 3V6Z" />
              <path d="M8 10h8" />
            </svg>
          </MobileDockButton>

          <MobileDockButton active={activePanel === "requests"} badge={requestBadgeCount} label="Solicitudes" onClick={() => togglePanel("requests")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16v14H4z" />
              <path d="M4 8l8 5 8-5" />
            </svg>
          </MobileDockButton>

          <MobileDockButton active={activePanel === "saved"} badge={savedCount} label="Guardados" onClick={() => togglePanel("saved")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 4h12v16l-6-3-6 3V4Z" />
            </svg>
          </MobileDockButton>

          <MobileDockButton active={activePanel === "notifications"} label="Avisos" onClick={() => togglePanel("notifications")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          </MobileDockButton>

          <MobileDockButton active={activePanel === "settings"} label="Explorar" onClick={() => togglePanel("settings")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v3" />
              <path d="M12 18v3" />
              <path d="M4.93 4.93l2.12 2.12" />
              <path d="M16.95 16.95l2.12 2.12" />
              <path d="M3 12h3" />
              <path d="M18 12h3" />
              <path d="M4.93 19.07l2.12-2.12" />
              <path d="M16.95 7.05l2.12-2.12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </MobileDockButton>

          <MobileDockButton active={activePanel === "profile"} label="Perfil" onClick={() => togglePanel("profile")}>
            <span className="text-[14px] font-bold">{avatarLabel || "U"}</span>
          </MobileDockButton>
        </div>
      </nav>

      <section
        ref={panelRef}
        className={`fixed bottom-0 top-0 z-30 transition-transform duration-[250ms] ease-in-out ${
          activePanel ? "translate-x-0" : "translate-x-full"
        } right-16 w-[min(960px,calc(100vw-64px))] max-sm:right-0 max-sm:w-screen`}
      >
        {activePanel ? (
          <div className="h-full border-r border-[#E5E7EB] bg-white" style={{ boxShadow: "8px 0 24px rgba(0,0,0,0.12)" }}>
            <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
              <button
                type="button"
                onClick={closePanel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6]"
                aria-label="Volver atrás"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <p className="text-[15px] font-semibold text-[#1A1A1A]">
                {activePanel === "chat"
                  ? "Mensajes"
                  : activePanel === "requests"
                  ? "Solicitudes"
                  : activePanel === "saved"
                  ? "Guardados"
                  : activePanel === "profile"
                  ? "Perfil"
                  : activePanel === "notifications"
                  ? "Notificaciones"
                  : "Ajustes"}
              </p>

              <div className="h-9 w-9" />
            </div>
            {activePanel === "chat" ? (
              <div className="grid h-[calc(100%-56px)] grid-cols-[40%_60%] max-sm:grid-cols-1">
                {!showMobileChatOnly ? (
                  <div className="h-full border-r border-[#E5E7EB] bg-white">
                    <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] px-4">
                      <h2 className="text-[18px] font-semibold text-[#1A1A1A]">Mensajes</h2>
                    </div>

                    <div className="h-[calc(100%-64px)] overflow-y-auto">
                      {loadingConversations ? (
                        <p className="px-4 py-6 text-[14px] text-[#6B7280]">Cargando conversaciones...</p>
                      ) : conversations.length ? (
                        conversations.map((conversation) => {
                          const isActive = activeMatchId === conversation.matchId;

                          return (
                            <button
                              key={conversation.matchId}
                              type="button"
                              onClick={() => onSelectConversation(conversation.matchId)}
                              className={`w-full border-b border-[#F3F4F6] px-4 py-3 text-left transition ${
                                isActive ? "bg-[#F8F8F8]" : "hover:bg-[#FAFAFA]"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative h-12 w-12 flex-none">
                                  <img
                                    src={withFallbackImage(conversation.otherUserPhoto)}
                                    alt={conversation.otherUserName}
                                    className="h-12 w-12 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${conversation.otherUserOnline ? "bg-[#22C55E]" : "bg-[#D1D5DB]"}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">{conversation.otherUserName}</p>
                                    <p className="text-[12px] text-[#9CA3AF]">
                                      {conversation.lastMessage ? formatRelativeTime(conversation.lastMessage.createdAt) : "nuevo"}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{conversation.compatibility}% compatible</p>
                                  <div className="mt-1 flex items-center justify-between gap-2">
                                    <p className="truncate text-[13px] text-[#6B7280]">{conversation.lastMessage?.content ?? "Aun no hay mensajes"}</p>
                                    {conversation.unreadCount > 0 ? (
                                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B6B] px-1 text-[11px] font-bold text-white">
                                        {conversation.unreadCount}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <p className="px-4 py-6 text-[14px] text-[#6B7280]">Todavia no tienes matches confirmados para chatear.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="flex h-full flex-col bg-[#FCFCFC]">
                  {activeConversation ? (
                    <>
                      <header className="flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {isMobile ? (
                            <button
                              type="button"
                              onClick={() => setActiveMatchId(null)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6]"
                              aria-label="Volver"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="m15 18-6-6 6-6" />
                              </svg>
                            </button>
                          ) : null}
                          <img
                            src={withFallbackImage(activeConversation.otherUserPhoto)}
                            alt={activeConversation.otherUserName}
                            className="h-10 w-10 rounded-full object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">{activeConversation.otherUserName}</p>
                            <p className="text-[12px] text-[#6B7280]">
                              {activeConversation.otherUserOnline ? "online" : "ultima conexion hace un rato"} · {activeConversation.compatibility}% compatible
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${activeConversation.otherUserId}`}
                            className="inline-flex h-9 items-center rounded-[999px] border border-[#FF6B6B]/25 px-3 text-[12px] font-semibold text-[#FF6B6B] transition hover:bg-[#FF6B6B]/10"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </header>

                      <div ref={messagesWrapRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        {loadingMessages ? (
                          <p className="text-[14px] text-[#6B7280]">Cargando historial...</p>
                        ) : (
                          <>
                            {messageVirtualization.topSpacer > 0 ? <div style={{ height: messageVirtualization.topSpacer }} /> : null}
                            <div className="space-y-1">
                              {messageVirtualization.visible.map((message, index) => {
                                const mine = message.senderId === currentUserId;
                                const prev = index > 0 ? messageVirtualization.visible[index - 1] : null;
                                const sameSenderGroup = prev?.senderId === message.senderId;
                                const isPaymentCard = message.kind !== "text";

                                return (
                                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${sameSenderGroup ? "mt-1" : "mt-3"}`}>
                                    <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                                      {isPaymentCard ? (
                                        <PaymentMessageCard message={message} mine={mine} />
                                      ) : (
                                        <div
                                          className={`rounded-2xl px-4 py-2 text-[14px] leading-6 ${
                                            mine
                                              ? "rounded-br-[4px] bg-[#FF6B6B] text-white"
                                              : "rounded-bl-[4px] bg-[#F1F1F1] text-[#1A1A1A]"
                                          }`}
                                          style={{ boxShadow: CARD_SHADOW }}
                                        >
                                          {message.content}
                                        </div>
                                      )}
                                      <div className={`mt-1 flex items-center gap-1 text-[11px] text-[#9CA3AF] ${mine ? "justify-end" : "justify-start"}`}>
                                        <span>{formatHour(message.createdAt)}</span>
                                        {mine ? (
                                          message.read ? (
                                            <span className="text-[#FF6B6B]">✓✓</span>
                                          ) : (
                                            <span className="text-[#9CA3AF]">✓</span>
                                          )
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {typingByMatch[activeConversation.matchId] ? (
                                <div className="mt-2 flex justify-start">
                                  <div className="rounded-2xl rounded-bl-[4px] bg-[#F1F1F1] px-4 py-2 text-[#6B7280]">
                                    <span className="inline-flex gap-1">
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF]" />
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF] [animation-delay:100ms]" />
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF] [animation-delay:200ms]" />
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="border-t border-[#E5E7EB] bg-white px-4 py-3">
                        <div className="flex min-h-14 items-center gap-2 rounded-[999px] bg-[#F3F4F6] px-3">
                          <input
                            value={draft}
                            onChange={(event) => handleDraftChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void handleSendMessage();
                              }
                            }}
                            placeholder="Escribe un mensaje..."
                            className="h-10 flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none"
                          />
                          <button
                            type="button"
                            disabled={!draft.trim()}
                            onClick={() => {
                              void handleSendMessage();
                            }}
                            className="inline-flex h-10 items-center rounded-[999px] bg-[#FF6B6B] px-4 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-[14px] text-[#6B7280]">
                      Selecciona una conversacion para empezar a hablar.
                    </div>
                  )}
                </div>
              </div>
            ) : activePanel === "requests" ? (
              <ContactRequestsPanel
                active={activePanel === "requests"}
                onCountsChange={handleRequestCountChange}
                onOpenChat={openChatFromRequest}
              />
            ) : activePanel === "profile" ? (
              <div className="h-[calc(100%-56px)]">
                <ProfileWelcomePanel
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onRequestLogout={() => setShowLogoutConfirm(true)}
                  onRequestDelete={() => { setDeleteAccountError(""); setShowDeleteConfirm(true); }}
                />
              </div>
            ) : activePanel === "onboarding-edit" ? (
              <div className="h-[calc(100%-56px)]">
                <OnboardingEditPanel currentUserId={currentUserId} />
              </div>
            ) : activePanel === "saved" ? (
              <SavedProfilesPanel active={activePanel === "saved"} />
            ) : (
                <div className="flex h-[calc(100%-56px)] items-center justify-center px-8 py-8 text-center">
                  <div className="w-full max-w-md space-y-4">
                    <p className="text-[20px] font-semibold text-[#1A1A1A]">
                      {activePanel === "notifications" ? "Notificaciones" : "Ajustes"}
                    </p>
                    <p className="text-[14px] text-[#6B7280]">
                      {activePanel === "settings"
                        ? "Gestiona la seguridad de tu cuenta desde este panel."
                        : "Este panel queda preparado para conectarlo en la siguiente iteracion."}
                    </p>

                    {activePanel === "settings" ? (
                      <div className="space-y-4 text-left">
                        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Pagos</p>
                          <p className="mt-2 text-[14px] leading-6 text-[#6B7280]">
                            Los pagos dentro de la plataforma estan temporalmente desactivados. El precio se muestra solo de forma informativa.
                          </p>
                        </div>

                        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Seguridad</p>
                          <p className="mt-2 text-[14px] leading-6 text-[#6B7280]">Cierra sesión o elimina tu cuenta desde aquí.</p>

                          <form action={logoutAction} className="mt-4">
                            <button
                              type="submit"
                              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-[14px] font-semibold text-[#4B5563] transition hover:bg-[#F8F8F8] active:scale-[0.99]"
                            >
                              Cerrar sesión
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteAccountError("");
                              setShowDeleteConfirm(true);
                            }}
                            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#FECACA] bg-white px-4 text-[14px] font-semibold text-[#EF4444] transition hover:bg-[#FEF2F2] active:scale-[0.99]"
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 14h10l1-14" />
                              <path d="M10 11v5" />
                              <path d="M14 11v5" />
                            </svg>
                            Eliminar cuenta
                          </button>
                        </div>
                      </div>
                    ) : null}

                  </div>
                </div>
            )}
          </div>
        ) : null}
      </section>

      {toasts.length ? (
        <div className="fixed bottom-5 left-5 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[13px] font-medium text-[#B91C1C]"
              style={{ boxShadow: CARD_SHADOW }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}

      {celebration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFE6E6] via-[#FFF4F4] to-[#FFEDEA] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/85 p-6 text-center backdrop-blur" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.14)" }}>
            <div className="relative mx-auto mb-4 h-24 w-44">
              <div className="absolute left-8 top-0 h-24 w-24 animate-[pulse_2s_ease-in-out_infinite] overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img
                  src="https://i.pravatar.cc/160?img=64"
                  alt="Tu perfil"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute right-8 top-0 h-24 w-24 animate-[pulse_2s_ease-in-out_infinite_150ms] overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img
                  src={withFallbackImage(celebration.otherUserPhoto)}
                  alt={celebration.otherUserName}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <p className="text-[36px] font-bold text-[#FF6B6B]">Es un match!</p>
            <p className="mt-1 text-[18px] font-semibold text-[#1A1A1A]">{celebration.otherUserName}</p>
            <p className="mt-1 text-[14px] text-[#6B7280]">{celebration.compatibility}% de compatibilidad</p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  setActivePanel("chat");
                  const target = conversations.find((item) => item.otherUserId === celebration.otherUserId);
                  if (target) {
                    setActiveMatchId(target.matchId);
                  }
                  setCelebration(null);
                }}
                className="min-h-12 rounded-xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white transition active:scale-[0.99]"
              >
                Enviar mensaje
              </button>
              <button
                type="button"
                onClick={() => setCelebration(null)}
                className="min-h-12 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[15px] font-semibold text-[#4B5563] transition active:scale-[0.99]"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-[20px] font-semibold text-[#1A1A1A]">Confirmar cierre de sesión</p>
            <p className="mt-2 text-[14px] leading-6 text-[#6B7280]">¿Quieres salir de tu cuenta ahora? Tendrás que iniciar sesión otra vez para volver a entrar.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="min-h-12 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[14px] font-semibold text-[#4B5563] transition active:scale-[0.99]"
              >
                Cancelar
              </button>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white transition active:scale-[0.99]"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 14h10l1-14" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>

            <p className="mt-4 text-[20px] font-semibold text-[#1A1A1A]">Eliminar cuenta</p>
            <p className="mt-2 text-[14px] leading-6 text-[#6B7280]">¿Estás seguro? Esta acción eliminará tu cuenta y todos tus datos permanentemente.</p>

            {deleteAccountError ? <p className="mt-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#B91C1C]">{deleteAccountError}</p> : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteAccountError("");
                }}
                disabled={isDeletingAccount}
                className="min-h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] font-semibold text-[#4B5563] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteAccount();
                }}
                disabled={isDeletingAccount}
                className="min-h-12 rounded-xl bg-[#EF4444] px-4 text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingAccount ? "Eliminando..." : "Eliminar mi cuenta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
