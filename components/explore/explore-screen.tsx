"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ChatDock } from "@/components/chat/chat-dock";
import type { MatchCelebrationPayload } from "@/lib/chat/types";

export type ExploreProfile = {
  id: string;
  nombre: string;
  edad: number;
  ciudad: string;
  zona: string;
  universidad: string | null;
  situacion: string;
  estudiaOTrabaja: string;
  esErasmus: boolean;
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  presupuesto: number;
  tienePiso: boolean;
  precioPiso: number | null;
  pisoDireccion: string | null;
  pisoCompaneros: number | null;
  pisoFotos: string[];
  compatibilidad: number;
  fotoUrl: string;
  badgeTags: [string, string, string];
};

export type ExploreScreenProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserHasPiso: boolean;
  currentUserPrimaryPiso: {
    id: string;
    precio: number;
    zona: string;
    direccion: string | null;
    descripcion: string;
    fotos: string[];
  } | null;
  initialCity: string;
  initialProfiles: ExploreProfile[];
  openChatWithUserId?: string | null;
  initialCelebration?: MatchCelebrationPayload | null;
};

type FilterState = {
  tienePiso: boolean;
  buscaHabitacion: boolean;
  buscaCompanero: boolean;
  fumador: boolean;
  aceptaMascotas: boolean;
  madrugador: boolean;
  nocturno: boolean;
  ambienteTranquilo: boolean;
  ambienteEquilibrado: boolean;
  ambienteSocial: boolean;
  deportePoco: boolean;
  deporteAlgunas: boolean;
  deporteFrecuente: boolean;
  soloEstudiantes: boolean;
  soloTrabajadores: boolean;
  erasmus: boolean;
};

type CitySuggestion = {
  id: string;
  city: string;
  label: string;
  center: [number, number];
};

const INITIAL_FILTERS: FilterState = {
  tienePiso: false,
  buscaHabitacion: false,
  buscaCompanero: false,
  fumador: false,
  aceptaMascotas: false,
  madrugador: false,
  nocturno: false,
  ambienteTranquilo: false,
  ambienteEquilibrado: false,
  ambienteSocial: false,
  deportePoco: false,
  deporteAlgunas: false,
  deporteFrecuente: false,
  soloEstudiantes: false,
  soloTrabajadores: false,
  erasmus: false,
};

const CARD_BG = "#FFFFFF";
const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.08)";
const CARD_HOVER_SHADOW = "0 8px 24px rgba(0,0,0,0.12)";

const CITY_CENTER: Record<string, [number, number]> = {
  madrid: [-3.7038, 40.4168],
  barcelona: [2.1734, 41.3851],
  valencia: [-0.3763, 39.4699],
  sevilla: [-5.9845, 37.3891],
  blanes: [2.7903, 41.6731],
};

const ZONE_OFFSETS: Record<string, [number, number]> = {
  centro: [0.01, 0.005],
  chamberi: [0.015, 0.01],
  salamanca: [0.012, -0.002],
  retiro: [0.016, -0.006],
  moncloa: [-0.016, 0.008],
  tetuan: [-0.013, 0.016],
  arganzuela: [0.008, -0.012],
  eixample: [0.012, 0.004],
  gracia: [0.014, 0.014],
  sants: [-0.01, -0.004],
  poblenou: [0.02, -0.006],
  "sant marti": [0.022, -0.002],
  "les corts": [-0.008, 0.005],
  raval: [0.006, 0.002],
};

const MENU_BUTTON_BASE =
  "inline-flex h-11 items-center gap-2 rounded-[999px] border border-[#D7E3F4] bg-[#EAF1FB] px-4 text-[14px] font-semibold text-[#1A2674] transition hover:border-[#B8CCEB] hover:bg-[#DFEAF9]";

const DEFAULT_MAX_PRICE = 1200;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function withFallbackImage(url: string) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortPrice(value: number) {
  return `${Math.round(value)}€`;
}

function prettyLabel(value: string) {
  const normalized = value.replaceAll("_", " ").trim();
  if (!normalized) return value;
  return normalized
    .split(" ")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function mapCoordinates(city: string, zone: string, id: string): [number, number] {
  const center = CITY_CENTER[normalizeText(city)] ?? CITY_CENTER.madrid;
  const zoneOffset = ZONE_OFFSETS[normalizeText(zone)] ?? [0.0, 0.0];
  const seed = id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const noiseLng = ((seed % 11) - 5) * 0.0012;
  const noiseLat = (((seed >> 2) % 11) - 5) * 0.0009;

  return [
    center[0] + zoneOffset[0] + noiseLng,
    center[1] + zoneOffset[1] + noiseLat,
  ];
}

function compatibilityPalette(score: number) {
  if (score >= 85) {
    return {
      badgeBg: "#0EA5A4",
      badgeText: "#FFFFFF",
      track: "#D7F3EF",
      fill: "linear-gradient(90deg, #0EA5A4 0%, #34D399 100%)",
    };
  }

  if (score >= 70) {
    return {
      badgeBg: "#3B82F6",
      badgeText: "#FFFFFF",
      track: "#DBEAFE",
      fill: "linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)",
    };
  }

  if (score >= 55) {
    return {
      badgeBg: "#F59E0B",
      badgeText: "#FFFFFF",
      track: "#FEF3C7",
      fill: "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)",
    };
  }

  return {
    badgeBg: "#A855F7",
    badgeText: "#FFFFFF",
    track: "#F3E8FF",
    fill: "linear-gradient(90deg, #A855F7 0%, #C084FC 100%)",
  };
}

function enhanceMapLabels(map: MapboxMapInstance) {
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    if (layer.type !== "symbol") {
      continue;
    }

    const hasTextField = Boolean(layer.layout && "text-field" in layer.layout);
    if (!hasTextField) {
      continue;
    }

    const layerId = layer.id.toLowerCase();
    const isLocationLabel =
      layerId.includes("place") ||
      layerId.includes("settlement") ||
      layerId.includes("country") ||
      layerId.includes("state") ||
      layerId.includes("poi");

    if (!isLocationLabel) {
      continue;
    }

    try {
      map.setLayoutProperty(layer.id, "text-size", [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        12,
        10,
        15,
        14,
        19,
      ]);
    } catch {
      // Some style layers are not mutable; skip safely.
    }
  }
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition active:scale-[0.98] ${
        active
          ? "border-[#FF6B6B] bg-[#FFF1F1] text-[#C64444]"
          : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#FF6B6B]/45"
      }`}
    >
      <span className="truncate">{prettyLabel(label)}</span>
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[11px] ${
          active ? "border-[#FF6B6B] bg-[#FF6B6B] text-white" : "border-[#D1D5DB] bg-white text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center" style={{ boxShadow: CARD_SHADOW }}>
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#FF6B6B]/10">
        <svg
          viewBox="0 0 24 24"
          className="h-10 w-10 text-[#FF6B6B]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7h16" />
          <path d="M7 3h10" />
          <path d="M6 11a6 6 0 1 0 12 0" />
          <path d="M12 16v5" />
        </svg>
      </div>
      <p className="mt-4 text-[16px] font-semibold text-[#1A1A1A]">Aun no hay perfiles en tu ciudad. Se el primero.</p>
      <button
        type="button"
        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6B6B] px-5 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Compartir la plataforma
      </button>
    </div>
  );
}

function ProfileCard({
  profile,
  highlight,
  delay,
  onSelect,
}: {
  profile: ExploreProfile;
  highlight: boolean;
  delay: number;
  onSelect: (profile: ExploreProfile) => void;
}) {
  const [filled, setFilled] = useState(false);
  const palette = compatibilityPalette(profile.compatibilidad);

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button type="button" onClick={() => onSelect(profile)} className="cursor-pointer text-left">
      <article
        className="animate-fade-up relative h-[380px] w-[280px] flex-none overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
        style={{
          background: CARD_BG,
          boxShadow: CARD_SHADOW,
          animationDelay: `${delay}ms`,
          animationFillMode: "both",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-2px)";
          event.currentTarget.style.boxShadow = CARD_HOVER_SHADOW;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0px)";
          event.currentTarget.style.boxShadow = CARD_SHADOW;
        }}
      >
        <div className="relative h-[171px]">
          <img
            src={withFallbackImage(profile.fotoUrl)}
            alt={profile.nombre}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />
          <span
            className="absolute right-3 top-3 rounded-[999px] px-3 py-1 text-[14px] font-bold"
            style={{ background: palette.badgeBg, color: palette.badgeText }}
          >
            {profile.compatibilidad}%
          </span>
        </div>

        <div className="flex h-[209px] flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[#1A1A1A]">
                {profile.nombre}, {profile.edad}
              </p>
              {profile.esErasmus ? (
                <span className="mt-1 inline-flex rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                  Erasmus
                </span>
              ) : null}
            </div>
            {profile.tienePiso && profile.precioPiso ? (
              <span className="text-[16px] font-bold text-[#FF6B6B]">{shortPrice(profile.precioPiso)}</span>
            ) : null}
          </div>

          <p className="mt-2 truncate text-[14px] font-normal leading-6 text-[#6B7280]">
            {profile.situacion.replaceAll("_", " ")} · {profile.estudiaOTrabaja}
          </p>
          <p className="mt-1 truncate text-[14px] font-normal leading-6 text-[#6B7280]">
            {profile.zona}, {profile.ciudad}
          </p>

          {profile.tienePiso && profile.pisoCompaneros ? (
            <p className="mt-1 truncate text-[13px] font-medium text-[#667085]">{profile.pisoCompaneros} en casa actualmente</p>
          ) : null}

          <div className="mt-3 flex gap-2">
            {profile.badgeTags.map((tag) => (
              <span
                key={`${profile.id}-${tag}`}
                className="truncate rounded-[999px] bg-[#F3F4F6] px-2 py-1 text-[14px] font-normal text-[#4B5563]"
              >
                {tag}
              </span>
            ))}
          </div>

          {highlight ? (
            <div className="mt-auto">
              <div className="h-2 overflow-hidden rounded-[999px]" style={{ background: palette.track }}>
                <div
                  className="h-full rounded-[999px] transition-all duration-700 ease-out"
                  style={{
                    background: palette.fill,
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.12)",
                    width: filled ? `${profile.compatibilidad}%` : "0%",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </button>
  );
}

function ProfileLocationMap({
  coordinates,
  city,
  zone,
  name,
}: {
  coordinates: [number, number];
  city: string;
  zone: string;
  name: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    let alive = true;

    void (async () => {
      const mapboxModule = await import("mapbox-gl");
      if (!alive || !containerRef.current) {
        return;
      }

      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = token;

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: coordinates,
        zoom: 12.4,
      });

      mapRef.current.on("load", () => {
        if (mapRef.current) {
          enhanceMapLabels(mapRef.current);
        }
      });

      mapRef.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        "top-right",
      );

      markerRef.current = new mapboxgl.Marker({ color: "#FF6B6B" })
        .setLngLat(coordinates)
        .addTo(mapRef.current as MapboxMapInstance);
    })();

    return () => {
      alive = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coordinates, token]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.flyTo({ center: coordinates, duration: 600 });
    markerRef.current?.setLngLat(coordinates);
  }, [coordinates]);

  if (!token) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
        <p className="text-[14px] font-semibold text-[#1A1A1A]">Mapa no disponible</p>
        <p className="mt-1 text-[13px] text-[#6B7280]">Configura NEXT_PUBLIC_MAPBOX_TOKEN para mostrar la ubicacion.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-[#D6E4F1] bg-white">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 px-3 py-2 backdrop-blur">
        <p className="truncate text-[13px] font-semibold text-[#1A1A1A]">Zona aproximada de {name}</p>
        <p className="truncate text-[12px] text-[#6B7280]">{zone}, {city}</p>
      </div>
    </div>
  );
}

function ProfileExpandedModal({
  profile,
  onClose,
  onOpenChat,
}: {
  profile: ExploreProfile;
  onClose: () => void;
  onOpenChat: (userId: string) => void;
}) {
  const [entered, setEntered] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const budgetValue = profile.precioPiso ?? profile.presupuesto;
  const hasUniversity = Boolean(profile.universidad?.trim());

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setEntered(true);
    });

    return () => {
      window.cancelAnimationFrame(id);
    };
  }, []);

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (window.innerWidth >= 640 || touchStartY.current === null) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? touchStartY.current;
    const delta = Math.max(0, currentY - touchStartY.current);
    setSheetOffset(Math.min(delta, 220));
  }

  function handleTouchEnd() {
    if (sheetOffset > 120) {
      onClose();
      return;
    }

    setSheetOffset(0);
    touchStartY.current = null;
  }

  const profileCoordinates = useMemo(
    () => mapCoordinates(profile.ciudad, profile.zona, profile.id),
    [profile.ciudad, profile.id, profile.zona],
  );

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-end backdrop-blur-sm transition-colors duration-300 sm:items-center sm:justify-center ${
        entered ? "bg-[#06111d]/70" : "bg-[#06111d]/0"
      }`}
    >
      <button type="button" onClick={onClose} className="absolute inset-0" aria-label="Cerrar detalle" />

      <article
        className={`relative z-10 h-[92vh] w-full overflow-hidden rounded-t-3xl bg-[#F7FAFC] transition-all duration-300 sm:h-auto sm:max-h-[90vh] sm:w-[min(980px,94vw)] sm:rounded-3xl ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          boxShadow: "0 36px 120px rgba(2, 12, 27, 0.45)",
          transform: `translateY(${(entered ? 0 : 26) + sheetOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[#C8D4E6] sm:hidden" />
        <div className="grid h-full grid-cols-1 sm:grid-cols-[0.95fr_1.05fr]">
          <div className="grid min-h-[260px] grid-rows-2 gap-3 p-3 sm:min-h-[620px] sm:p-4">
            <div className="relative h-full overflow-hidden rounded-2xl border border-[#D6E4F1] bg-white">
              <img src={withFallbackImage(profile.fotoUrl)} alt={profile.nombre} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#081A3A]/70 via-transparent to-transparent" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-[#081A3A]/60 text-white transition hover:bg-[#081A3A]/80"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="inline-flex rounded-full border border-white/45 bg-white/15 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur">
                  Compatibilidad {profile.compatibilidad}%
                </div>
                <h3 className="mt-2 text-[32px] font-black tracking-tight text-white">{profile.nombre}, {profile.edad}</h3>
                <p className="text-[14px] font-medium text-white/85">{profile.zona}, {profile.ciudad}</p>
                {profile.esErasmus ? (
                  <span className="mt-2 inline-flex rounded-full border border-white/40 bg-white/20 px-2.5 py-1 text-[12px] font-semibold text-white">
                    Erasmus
                  </span>
                ) : null}
              </div>
            </div>

            <div className="h-full overflow-hidden rounded-2xl border border-[#D6E4F1] bg-white">
              <ProfileLocationMap
                coordinates={profileCoordinates}
                city={profile.ciudad}
                zone={profile.zona}
                name={profile.nombre}
              />
            </div>
          </div>

          <div className="flex h-full flex-col overflow-y-auto bg-[#F7FAFC] p-6 sm:p-8">
            <div
              className={`flex items-center justify-between gap-3 transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "70ms" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0F766E]/12 px-3 py-2 text-[13px] font-semibold text-[#0F766E]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#0F766E]" />
                {profile.tienePiso ? "Tiene apartamento disponible" : "Busca apartamento"}
              </div>
              <div className="rounded-2xl bg-[#0B1025] px-4 py-3 text-right text-white">
                <p className="text-[11px] uppercase tracking-[0.08em] text-white/70">Presupuesto</p>
                <p className="text-[22px] font-black">{formatCurrency(budgetValue)}</p>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl border border-[#D6E4F1] bg-white p-4 transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "120ms" }}
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6C7A89]">Perfil</p>
              <p className="mt-2 text-[15px] font-semibold text-[#1B2430]">
                {profile.situacion.replaceAll("_", " ")} · {profile.estudiaOTrabaja}
              </p>
              {profile.tienePiso && profile.precioPiso ? (
                <p className="mt-1 text-[14px] font-semibold text-[#1D4ED8]">Alquiler: {formatCurrency(profile.precioPiso)}/mes</p>
              ) : null}
              {profile.tienePiso && profile.pisoDireccion ? (
                <p className="mt-1 text-[13px] text-[#52606D]">{profile.pisoDireccion}</p>
              ) : null}
              {profile.tienePiso && profile.pisoCompaneros ? (
                <p className="mt-1 text-[13px] text-[#52606D]">{profile.pisoCompaneros} personas viviendo actualmente</p>
              ) : null}
              {hasUniversity ? (
                <p className="mt-1 text-[14px] text-[#52606D]">{profile.universidad}</p>
              ) : null}
            </div>

            <div
              className={`mt-4 rounded-2xl border border-[#D6E4F1] bg-white p-4 transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "170ms" }}
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6C7A89]">Estilo de convivencia</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-semibold text-[#1B2430]">
                <span className="rounded-xl bg-[#EEF7F4] px-3 py-2">Horario: {profile.horario}</span>
                <span className="rounded-xl bg-[#EFF5FC] px-3 py-2">Ambiente: {profile.ambiente}</span>
                <span className="rounded-xl bg-[#FFF3E8] px-3 py-2">{profile.fumar ? "Fumador" : "No fumador"}</span>
                <span className="rounded-xl bg-[#F3EEFF] px-3 py-2">{profile.mascotas ? "Convive con mascotas" : "Sin mascotas"}</span>
              </div>
            </div>

            <div
              className={`mt-4 rounded-2xl border border-[#D6E4F1] bg-white p-4 transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "220ms" }}
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6C7A89]">Intereses</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#E6F9F6] px-3 py-1 text-[13px] font-semibold text-[#0B7D73]">Deporte: {profile.deporte}</span>
                {profile.aficiones.map((hobby) => (
                  <span key={`${profile.id}-${hobby}`} className="rounded-full bg-[#EAF0FF] px-3 py-1 text-[13px] font-semibold text-[#2949B2]">
                    {hobby}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={`mt-6 flex flex-col gap-3 transition-all duration-500 sm:flex-row ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "280ms" }}
            >
              <button
                type="button"
                onClick={() => onOpenChat(profile.id)}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#0B1025] px-5 text-[15px] font-bold text-white transition hover:bg-[#162043]"
              >
                Enviar mensaje
              </button>
              <Link
                href={`/profile/${profile.id}`}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[#0B1025]/20 bg-white px-5 text-[15px] font-bold text-[#0B1025] transition hover:border-[#0B1025]"
              >
                Ver perfil completo
              </Link>
            </div>

            <p
              className={`mt-4 text-[12px] text-[#7B8794] transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "320ms" }}
            >
              Consejo: los perfiles con compatibilidad alta suelen responder mejor durante las primeras 24 horas.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[18px] font-semibold text-[#1A1A1A]">{title}</h2>
      <span className="inline-flex h-8 items-center rounded-[999px] bg-[#FF6B6B] px-3 text-[14px] font-bold text-white">
        {count}
      </span>
    </div>
  );
}

function ExploreMap({
  city,
  profiles,
  selectedCenter,
}: {
  city: string;
  profiles: ExploreProfile[];
  selectedCenter: [number, number] | null;
}) {
  const [selected, setSelected] = useState<ExploreProfile | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const center = useMemo(
    () => selectedCenter ?? CITY_CENTER[normalizeText(city)] ?? CITY_CENTER.madrid,
    [city, selectedCenter],
  );

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    let active = true;

    void (async () => {
      const mapboxModule = await import("mapbox-gl");
      if (!active || !containerRef.current) {
        return;
      }

      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = token;

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: 11,
      });

      mapRef.current.on("load", () => {
        if (mapRef.current) {
          enhanceMapLabels(mapRef.current);
        }
        setMapReady(true);
      });

      mapRef.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        "bottom-right",
      );
    })();

    return () => {
      active = false;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center, token]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) {
      return;
    }

    mapRef.current.flyTo({ center, duration: 700 });
  }, [center, mapReady]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    let alive = true;

    void (async () => {
      const mapboxModule = await import("mapbox-gl");
      if (!alive || !mapRef.current) {
        return;
      }

      const mapboxgl = mapboxModule.default;

      profiles.slice(0, 40).forEach((profile) => {
        const [lng, lat] = mapCoordinates(profile.ciudad, profile.zona, profile.id);
        const highAffinity = profile.compatibilidad >= 70;
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = "map-price-marker";
        markerElement.style.width = highAffinity ? "60px" : "50px";
        markerElement.style.height = highAffinity ? "60px" : "50px";
        markerElement.style.borderRadius = "999px";
        markerElement.style.border = highAffinity ? "3px solid #FF6B6B" : "2px solid #FFFFFF";
        markerElement.style.backgroundImage = `url(${withFallbackImage(profile.fotoUrl)})`;
        markerElement.style.backgroundSize = "cover";
        markerElement.style.backgroundPosition = "center";
        markerElement.style.boxShadow = highAffinity
          ? "0 0 0 5px rgba(255,107,107,0.25), 0 2px 8px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(0,0,0,0.2)";
        markerElement.style.cursor = "pointer";
        markerElement.addEventListener("click", () => {
          setSelected(profile);
          mapRef.current?.flyTo({ center: [lng, lat], duration: 450 });
        });

        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat([lng, lat])
          .addTo(mapRef.current as MapboxMapInstance);

        markersRef.current.push(marker);
      });
    })();

    return () => {
      alive = false;
    };
  }, [mapReady, profiles]);

  if (!token) {
    return (
      <div className="relative h-[280px] w-full rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:h-[360px]" style={{ boxShadow: CARD_SHADOW }}>
        <p className="text-[16px] font-semibold text-[#1A1A1A]">Mapa no disponible</p>
        <p className="mt-2 text-[14px] leading-6 text-[#6B7280]">
          Configura NEXT_PUBLIC_MAPBOX_TOKEN para habilitar el mapa interactivo.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white sm:h-[360px]" style={{ boxShadow: CARD_SHADOW }}>
      <div ref={containerRef} className="h-full w-full" />

      {selected ? (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-2xl border border-[#E5E7EB] bg-white p-3" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-3">
            <img
              src={withFallbackImage(selected.fotoUrl)}
              alt={selected.nombre}
              className="h-14 w-14 rounded-xl object-cover"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[#1A1A1A]">{selected.nombre}</p>
              <p className="text-[14px] font-bold text-[#FF6B6B]">{selected.compatibilidad}% de compatibilidad</p>
              {selected.tienePiso && selected.precioPiso ? (
                <p className="text-[12px] font-semibold text-[#1D4ED8]">Alquila por {shortPrice(selected.precioPiso)}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ExploreScreen({
  currentUserId,
  currentUserName,
  currentUserHasPiso,
  currentUserPrimaryPiso,
  initialCity,
  initialProfiles,
  openChatWithUserId,
  initialCelebration,
}: ExploreScreenProps) {
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<ExploreProfile | null>(null);
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(openChatWithUserId ?? null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE);
  const [openMenu, setOpenMenu] = useState<"tipo" | "habitos" | "perfil" | "precio" | null>(null);
  const filtersMenuRef = useRef<HTMLDivElement | null>(null);
  const cityPickerRef = useRef<HTMLDivElement | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const hasActiveFiltering =
    Boolean(selectedCity) ||
    Object.values(filters).some(Boolean) ||
    selectedHobbies.length > 0 ||
    maxPrice !== DEFAULT_MAX_PRICE;

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length +
    selectedHobbies.length +
    (maxPrice !== DEFAULT_MAX_PRICE ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const availableHobbies = useMemo(() => {
    const normalized = new Map<string, string>();
    for (const profile of initialProfiles) {
      for (const hobby of profile.aficiones ?? []) {
        const trimmed = hobby.trim();
        if (!trimmed) continue;
        const key = normalizeText(trimmed);
        if (!normalized.has(key)) {
          normalized.set(key, trimmed);
        }
      }
    }

    return Array.from(normalized.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [initialProfiles]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!filtersMenuRef.current) return;
      if (filtersMenuRef.current.contains(event.target as Node)) return;
      setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    function handleCityOutsideClick(event: MouseEvent) {
      if (!cityPickerRef.current) return;
      if (cityPickerRef.current.contains(event.target as Node)) return;
      setCityMenuOpen(false);
    }

    document.addEventListener("mousedown", handleCityOutsideClick);
    return () => document.removeEventListener("mousedown", handleCityOutsideClick);
  }, []);

  useEffect(() => {
    if (!expandedProfile) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpandedProfile(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [expandedProfile]);

  useEffect(() => {
    setChatTargetUserId(openChatWithUserId ?? null);
  }, [openChatWithUserId]);

  useEffect(() => {
    const search = cityQuery.trim();

    if (!mapboxToken || search.length < 2) {
      setCitySuggestions([]);
      setIsLoadingCities(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsLoadingCities(true);

      void fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          search,
        )}.json?autocomplete=true&types=place,locality&country=es&language=es&limit=10&access_token=${mapboxToken}`,
        { signal: controller.signal },
      )
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Error de geocoding"))))
        .then((payload: { features?: Array<{ id: string; text: string; place_name: string; center: [number, number] }> }) => {
          const suggestions = (payload.features ?? [])
            .filter((item) => Array.isArray(item.center) && item.center.length === 2)
            .map((item) => ({
              id: item.id,
              city: item.text,
              label: item.place_name,
              center: [item.center[0], item.center[1]] as [number, number],
            }));

          setCitySuggestions(suggestions);
        })
        .catch(() => {
          setCitySuggestions([]);
        })
        .finally(() => {
          setIsLoadingCities(false);
        });
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [cityQuery, mapboxToken]);

  const filteredProfiles = useMemo(() => {
    if (!hasActiveFiltering) {
      return initialProfiles;
    }

    const search = normalizeText(selectedCity?.city ?? "");

    return initialProfiles.filter((profile) => {
      const inCity = !search || normalizeText(profile.ciudad).includes(search);
      if (!inCity) return false;

      if (filters.tienePiso && !profile.tienePiso) return false;
      if (filters.buscaHabitacion && !normalizeText(profile.situacion).includes("busco_habitacion")) return false;
      if (filters.buscaCompanero && !normalizeText(profile.situacion).includes("buscar_juntos") && !profile.tienePiso) return false;
      if (filters.fumador && !profile.fumar) return false;
      if (filters.aceptaMascotas && !profile.mascotas) return false;
      if (filters.madrugador && !normalizeText(profile.horario).includes("madrugador")) return false;
      if (filters.nocturno && !normalizeText(profile.horario).includes("nocturno")) return false;
      if (filters.ambienteTranquilo && !normalizeText(profile.ambiente).includes("tranquilo")) return false;
      if (filters.ambienteEquilibrado && !normalizeText(profile.ambiente).includes("equilibrado")) return false;
      if (filters.ambienteSocial && !normalizeText(profile.ambiente).includes("social")) return false;
      if (filters.deportePoco && !normalizeText(profile.deporte).includes("poco")) return false;
      if (filters.deporteAlgunas && !normalizeText(profile.deporte).includes("algunas")) return false;
      if (filters.deporteFrecuente && !normalizeText(profile.deporte).includes("frecuente")) return false;
      if (filters.soloEstudiantes && !normalizeText(profile.estudiaOTrabaja).includes("estudiante")) return false;
      if (filters.soloTrabajadores && !normalizeText(profile.estudiaOTrabaja).includes("trabajador")) return false;
      if (filters.erasmus && !profile.esErasmus) return false;

      if (selectedHobbies.length) {
        const profileHobbies = new Set((profile.aficiones ?? []).map((item) => normalizeText(item)));
        const matchesAll = selectedHobbies.every((hobby) => profileHobbies.has(normalizeText(hobby)));
        if (!matchesAll) return false;
      }

      const comparablePrice = profile.precioPiso ?? profile.presupuesto;
      return comparablePrice <= maxPrice;
    });
  }, [cityQuery, filters, hasActiveFiltering, initialProfiles, maxPrice, selectedHobbies]);

  const featured = useMemo(
    () => filteredProfiles.filter((profile) => profile.compatibilidad >= 70).sort((a, b) => b.compatibilidad - a.compatibilidad),
    [filteredProfiles],
  );

  const others = useMemo(
    () => filteredProfiles.filter((profile) => profile.compatibilidad < 70).sort((a, b) => b.compatibilidad - a.compatibilidad),
    [filteredProfiles],
  );

  function toggleFilter(key: keyof FilterState) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateCityQuery(value: string) {
    setCityQuery(value);
    setSelectedCity(null);
    setCityMenuOpen(value.trim().length >= 2);
  }

  function updateMaxPrice(value: number) {
    setMaxPrice(value);
  }

  function clearAllFilters() {
    setFilters(INITIAL_FILTERS);
    setSelectedHobbies([]);
    setMaxPrice(DEFAULT_MAX_PRICE);
    setCityQuery("");
    setSelectedCity(null);
    setCitySuggestions([]);
    setCityMenuOpen(false);
    setOpenMenu(null);
  }

  function pickCity(suggestion: CitySuggestion) {
    setCityQuery(suggestion.city);
    setSelectedCity(suggestion);
    setCityMenuOpen(false);
  }

  function openChatForProfile(userId: string) {
    setExpandedProfile(null);
    setChatTargetUserId(null);
    window.requestAnimationFrame(() => {
      setChatTargetUserId(userId);
    });
  }

  function toggleHobbyFilter(hobby: string) {
    setSelectedHobbies((prev) => {
      const exists = prev.some((item) => normalizeText(item) === normalizeText(hobby));
      if (exists) {
        return prev.filter((item) => normalizeText(item) !== normalizeText(hobby));
      }
      return [...prev, hobby];
    });
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] pr-16 text-[#1A1A1A] max-sm:pr-0">
      <div className="sticky top-0 z-30 bg-white" style={{ boxShadow: CARD_SHADOW }}>
        <header className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-[300px]">
            <BrandLogo className="h-16 w-auto" />
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div ref={cityPickerRef} className="relative w-full max-w-[420px]">
              <label className="relative block w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                value={cityQuery}
                onChange={(event) => updateCityQuery(event.target.value)}
                onFocus={() => {
                  if (cityQuery.trim().length >= 2) {
                    setCityMenuOpen(true);
                  }
                }}
                placeholder="Escribe ciudad o pueblo (Espana)"
                className="h-10 w-full rounded-[10px] border border-[#E5E7EB] bg-[#F8F8F8] pl-10 pr-10 text-[14px] font-normal text-[#1A1A1A] outline-none transition focus:border-[#FF6B6B]"
              />
              </label>

              {selectedCity ? (
                <button
                  type="button"
                  onClick={() => {
                    setCityQuery("");
                    setSelectedCity(null);
                    setCitySuggestions([]);
                    setCityMenuOpen(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6B7280] transition hover:bg-[#EEF2FF] hover:text-[#1A2674]"
                  aria-label="Limpiar ciudad"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m18 6-12 12" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              ) : null}

              {cityMenuOpen ? (
                <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-2xl border border-[#D7E3F4] bg-white" style={{ boxShadow: CARD_HOVER_SHADOW }}>
                  {isLoadingCities ? (
                    <p className="px-4 py-3 text-[13px] text-[#6B7280]">Buscando ciudades y pueblos...</p>
                  ) : citySuggestions.length ? (
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {citySuggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            onClick={() => pickCity(suggestion)}
                            className="flex w-full items-start gap-2 px-4 py-2 text-left transition hover:bg-[#EEF2FF]"
                          >
                            <span className="mt-1 text-[#1A2674]">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[14px] font-semibold text-[#1A1A1A]">{suggestion.city}</span>
                              <span className="block truncate text-[12px] text-[#6B7280]">{suggestion.label}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-3 text-[13px] text-[#6B7280]">No hay coincidencias en Espana. Selecciona una opcion valida.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

        </header>

        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div ref={filtersMenuRef} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => (prev === "tipo" ? null : "tipo"))}
                className={MENU_BUTTON_BASE}
              >
                Tipo
                <Chevron open={openMenu === "tipo"} />
              </button>

              {openMenu === "tipo" ? (
                <div className="absolute left-0 top-12 z-40 w-[320px] rounded-2xl border border-[#E5E7EB] bg-white p-3" style={{ boxShadow: CARD_HOVER_SHADOW }}>
                  <p className="mb-2 text-[13px] font-semibold text-[#374151]">Situación de vivienda</p>
                  <div className="grid grid-cols-1 gap-2">
                    <FilterChip active={filters.tienePiso} label="Tengo Piso Libre" onClick={() => toggleFilter("tienePiso")} />
                    <FilterChip active={filters.buscaHabitacion} label="Busco Habitación" onClick={() => toggleFilter("buscaHabitacion")} />
                    <FilterChip active={filters.buscaCompanero} label="Buscar Juntos" onClick={() => toggleFilter("buscaCompanero")} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => (prev === "habitos" ? null : "habitos"))}
                className={MENU_BUTTON_BASE}
              >
                Hábitos
                <Chevron open={openMenu === "habitos"} />
              </button>

              {openMenu === "habitos" ? (
                <div className="absolute left-0 top-12 z-40 w-[430px] rounded-2xl border border-[#E5E7EB] bg-white p-3" style={{ boxShadow: CARD_HOVER_SHADOW }}>
                  <p className="mb-2 text-[13px] font-semibold text-[#374151]">Convivencia</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterChip active={filters.fumador} label="Fumador" onClick={() => toggleFilter("fumador")} />
                    <FilterChip active={filters.aceptaMascotas} label="Acepta Mascotas" onClick={() => toggleFilter("aceptaMascotas")} />
                    <FilterChip active={filters.madrugador} label="Madrugador" onClick={() => toggleFilter("madrugador")} />
                    <FilterChip active={filters.nocturno} label="Nocturno" onClick={() => toggleFilter("nocturno")} />
                  </div>

                  <p className="mb-2 mt-4 text-[13px] font-semibold text-[#374151]">Ambiente</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterChip active={filters.ambienteTranquilo} label="Tranquilo" onClick={() => toggleFilter("ambienteTranquilo")} />
                    <FilterChip active={filters.ambienteEquilibrado} label="Equilibrado" onClick={() => toggleFilter("ambienteEquilibrado")} />
                    <FilterChip active={filters.ambienteSocial} label="Social" onClick={() => toggleFilter("ambienteSocial")} />
                  </div>

                  <p className="mb-2 mt-4 text-[13px] font-semibold text-[#374151]">Deporte</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterChip active={filters.deportePoco} label="Poco" onClick={() => toggleFilter("deportePoco")} />
                    <FilterChip active={filters.deporteAlgunas} label="Algunas Veces" onClick={() => toggleFilter("deporteAlgunas")} />
                    <FilterChip active={filters.deporteFrecuente} label="Frecuente" onClick={() => toggleFilter("deporteFrecuente")} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => (prev === "perfil" ? null : "perfil"))}
                className={MENU_BUTTON_BASE}
              >
                Situación y Aficiones
                <Chevron open={openMenu === "perfil"} />
              </button>

              {openMenu === "perfil" ? (
                <div className="absolute left-0 top-12 z-40 w-[430px] rounded-2xl border border-[#E5E7EB] bg-white p-3" style={{ boxShadow: CARD_HOVER_SHADOW }}>
                  <p className="mb-2 text-[13px] font-semibold text-[#374151]">Situación académica y laboral</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterChip active={filters.soloEstudiantes} label="Solo Estudiantes" onClick={() => toggleFilter("soloEstudiantes")} />
                    <FilterChip active={filters.soloTrabajadores} label="Solo Trabajadores" onClick={() => toggleFilter("soloTrabajadores")} />
                    <FilterChip active={filters.erasmus} label="Erasmus" onClick={() => toggleFilter("erasmus")} />
                  </div>

                  <p className="mb-2 mt-4 text-[13px] font-semibold text-[#374151]">Aficiones</p>
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {availableHobbies.length ? (
                      availableHobbies.map((hobby) => (
                        <FilterChip
                          key={hobby}
                          active={selectedHobbies.some((item) => normalizeText(item) === normalizeText(hobby))}
                          label={hobby}
                          onClick={() => toggleHobbyFilter(hobby)}
                        />
                      ))
                    ) : (
                      <p className="col-span-2 text-[13px] text-[#6B7280]">Sin aficiones disponibles todavía.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => (prev === "precio" ? null : "precio"))}
                className={MENU_BUTTON_BASE}
              >
                {formatCurrency(0)} - {formatCurrency(maxPrice)}
                <Chevron open={openMenu === "precio"} />
              </button>

              {openMenu === "precio" ? (
                <div className="absolute right-0 top-12 z-40 w-[330px] rounded-2xl border border-[#E5E7EB] bg-white p-4" style={{ boxShadow: CARD_HOVER_SHADOW }}>
                  <p className="text-[13px] font-semibold text-[#6B7280]">Precio maximo mensual</p>
                  <input
                    type="range"
                    min={400}
                    max={2200}
                    step={50}
                    value={maxPrice}
                    onChange={(event) => updateMaxPrice(Number(event.target.value))}
                    className="mt-3 w-full accent-[#FF6B6B]"
                  />
                  <p className="mt-2 text-[14px] font-semibold text-[#1A1A1A]">Hasta {formatCurrency(maxPrice)}</p>
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex h-9 items-center rounded-[999px] bg-[#131C80] px-3 text-[13px] font-bold text-white">
                Filtros {activeFilterCount}
              </span>

              {hasActiveFiltering ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex h-9 items-center rounded-[999px] border border-[#E5E7EB] bg-white px-3 text-[13px] font-semibold text-[#6B7280] transition hover:border-[#FF6B6B] hover:text-[#FF6B6B]"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        {cityQuery.trim().length > 0 && !selectedCity ? (
          <p className="mb-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[13px] font-semibold text-[#92400E]">
            Selecciona una ciudad o pueblo de la lista para aplicar el filtro y centrar el mapa.
          </p>
        ) : null}

        <ExploreMap city={selectedCity?.city || initialCity} profiles={filteredProfiles} selectedCenter={selectedCity?.center ?? null} />

        <section className="mt-6">
          <SectionTitle title="Mas compatibles contigo" count={featured.length} />
          {featured.length ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-4">
                {featured.map((profile, index) => (
                  <ProfileCard key={profile.id} profile={profile} highlight delay={index * 50} onSelect={setExpandedProfile} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="mt-8">
          <SectionTitle title="Otros perfiles en tu ciudad" count={others.length} />
          {others.length ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-4">
                {others.map((profile, index) => (
                  <ProfileCard key={profile.id} profile={profile} highlight={false} delay={index * 50} onSelect={setExpandedProfile} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 text-[14px] font-normal leading-6 text-[#6B7280]" style={{ boxShadow: CARD_SHADOW }}>
              No hay mas perfiles por mostrar con los filtros actuales.
            </div>
          )}
        </section>
      </div>

      <ChatDock
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserHasPiso={currentUserHasPiso}
        currentUserPrimaryPiso={currentUserPrimaryPiso}
        openChatWithUserId={chatTargetUserId}
        initialCelebration={initialCelebration}
      />

      {expandedProfile ? (
        <ProfileExpandedModal
          profile={expandedProfile}
          onClose={() => setExpandedProfile(null)}
          onOpenChat={openChatForProfile}
        />
      ) : null}
    </main>
  );
}
