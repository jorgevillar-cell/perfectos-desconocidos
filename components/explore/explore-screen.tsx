"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import Link from "next/link";
import { ChatDock } from "@/components/chat/chat-dock";
import { SiteTopNav } from "@/components/navigation/site-top-nav";
import type { MatchCelebrationPayload } from "@/lib/chat/types";
import { smoothScrollToHash } from "@/lib/ui/section-scroll";

export type ExploreProfile = {
  id: string;
  verificado: boolean;
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
  userType: "propietario" | "buscador";
  companionCount: number;
  companionNames: string[];
  companionPhotos: string[];
  compatibilidad: number;
  fotoUrl: string;
  badgeTags: [string, string, string];
};

export type ExploreScreenProps = {
  isAuthenticated: boolean;
  currentUserId: string;
  currentUserName: string;
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
  bilbao: [-2.934985, 43.263012],
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

const EXAMPLE_CASE_CARDS: ExploreProfile[] = [
  {
    id: "demo-case-busca-piso",
    verificado: true,
    nombre: "Lucia",
    edad: 24,
    ciudad: "Madrid",
    zona: "Chamberi",
    universidad: "Universidad Complutense de Madrid",
    situacion: "busco_habitacion",
    estudiaOTrabaja: "estudiante",
    esErasmus: false,
    fumar: false,
    mascotas: true,
    horario: "normal",
    ambiente: "tranquilo",
    deporte: "algunas",
    aficiones: ["cine", "lectura"],
    presupuesto: 750,
    tienePiso: false,
    precioPiso: null,
    pisoDireccion: null,
    pisoCompaneros: null,
    pisoFotos: [],
    userType: "buscador",
    companionCount: 0,
    companionNames: [],
    companionPhotos: [],
    compatibilidad: 82,
    fotoUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
    badgeTags: ["No fuma", "Mascotas", "Horario normal"],
  },
  {
    id: "demo-case-busca-juntos",
    verificado: false,
    nombre: "Ainhoa",
    edad: 26,
    ciudad: "Barcelona",
    zona: "Gracia",
    universidad: null,
    situacion: "buscar_juntos",
    estudiaOTrabaja: "trabajador",
    esErasmus: false,
    fumar: false,
    mascotas: false,
    horario: "madrugador",
    ambiente: "equilibrado",
    deporte: "frecuente",
    aficiones: ["deporte", "viajes"],
    presupuesto: 980,
    tienePiso: false,
    precioPiso: null,
    pisoDireccion: null,
    pisoCompaneros: null,
    pisoFotos: [],
    userType: "buscador",
    companionCount: 0,
    companionNames: [],
    companionPhotos: [],
    compatibilidad: 76,
    fotoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    badgeTags: ["No fuma", "Sin mascotas", "Madrugador"],
  },
  {
    id: "demo-case-piso-solo",
    verificado: true,
    nombre: "Carla",
    edad: 29,
    ciudad: "Valencia",
    zona: "Ruzafa",
    universidad: null,
    situacion: "tengo_piso_libre",
    estudiaOTrabaja: "trabajador",
    esErasmus: false,
    fumar: false,
    mascotas: true,
    horario: "normal",
    ambiente: "tranquilo",
    deporte: "poco",
    aficiones: ["musica", "cocina"],
    presupuesto: 0,
    tienePiso: true,
    precioPiso: 620,
    pisoDireccion: "Calle Sueca, Valencia",
    pisoCompaneros: 0,
    pisoFotos: [],
    userType: "propietario",
    companionCount: 0,
    companionNames: [],
    companionPhotos: [],
    compatibilidad: 88,
    fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    badgeTags: ["No fuma", "Mascotas", "Horario normal"],
  },
  {
    id: "demo-case-piso-con-gente",
    verificado: true,
    nombre: "Marta",
    edad: 27,
    ciudad: "Sevilla",
    zona: "Nervion",
    universidad: "Universidad de Sevilla",
    situacion: "tengo_piso_libre",
    estudiaOTrabaja: "ambas",
    esErasmus: false,
    fumar: false,
    mascotas: false,
    horario: "nocturno",
    ambiente: "social",
    deporte: "algunas",
    aficiones: ["viajes", "cine"],
    presupuesto: 0,
    tienePiso: true,
    precioPiso: 540,
    pisoDireccion: "Avenida San Francisco Javier, Sevilla",
    pisoCompaneros: 2,
    pisoFotos: [],
    userType: "propietario",
    companionCount: 2,
    companionNames: ["Alba", "Paula"],
    companionPhotos: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    ],
    compatibilidad: 72,
    badgeTags: ["No fuma", "Sin mascotas", "Nocturno"],
    fotoUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  },
];

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

function profileMapQuery(profile: ExploreProfile) {
  if (profile.tienePiso && profile.pisoDireccion?.trim()) {
    return profile.pisoDireccion.trim();
  }

  return `${profile.zona}, ${profile.ciudad}`;
}

function profileMapHref(profile: ExploreProfile) {
  if (profile.tienePiso) {
    return `/profile/${profile.id}#mapa`;
  }

  return `/explore?ciudad=${encodeURIComponent(profile.ciudad)}`;
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
  isAuthenticated,
  onAuthRequired,
}: {
  profile: ExploreProfile;
  highlight: boolean;
  delay: number;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}) {
  const [filled, setFilled] = useState(false);
  const palette = compatibilityPalette(profile.compatibilidad);
  const isOwner = profile.userType === "propietario";
  const ownerCompanionCount = profile.companionCount || profile.pisoCompaneros || 0;
  const ownerTag = profile.situacion.includes("tengo_piso") ? "Tiene piso libre" : "Propietario";
  const seekerTag = profile.situacion.includes("buscar_juntos") ? "Busca companero" : "Busca habitacion";
  const priceBadgeClass = isOwner
    ? "bg-[#FFF1EE] text-[#C65A54]"
    : "bg-[#EEF4FF] text-[#1D4ED8]";

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <article
      className="animate-fade-up relative h-[406px] w-[282px] flex-none overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
      style={{
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
          className={`absolute right-3 top-3 rounded-[999px] px-3 py-1 text-[14px] font-bold shadow-sm ${priceBadgeClass}`}
        >
          {isOwner && profile.precioPiso ? shortPrice(profile.precioPiso) : `${profile.compatibilidad}%`}
        </span>
        <span className="absolute left-3 top-3 rounded-[999px] border border-white/65 bg-white/92 px-3 py-1 text-[12px] font-semibold text-[#1F2937]">
          {isOwner ? ownerTag : seekerTag}
        </span>
      </div>

      <div className="flex h-[235px] flex-col overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {profile.verificado ? (
              <span className="inline-flex rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                ✓ Verificada
              </span>
            ) : null}
            <p className="mt-1 truncate text-[16px] font-semibold text-[#1A1A1A]">
              {profile.nombre}, {profile.edad}
            </p>
            {profile.esErasmus ? (
              <span className="mt-1 inline-flex rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                Erasmus
              </span>
            ) : null}
          </div>
          {!isOwner ? (
            <span className="text-[16px] font-bold text-[#C65A54]">{shortPrice(profile.presupuesto)}</span>
          ) : profile.tienePiso && profile.precioPiso ? (
            <span className="text-[16px] font-bold text-[#C65A54]">{shortPrice(profile.precioPiso)}</span>
          ) : null}
        </div>

        <p className="mt-2 truncate text-[14px] font-normal leading-6 text-[#6B7280]">
          {isOwner ? `Zona ${profile.zona}` : `${profile.situacion.replaceAll("_", " ")} · ${profile.estudiaOTrabaja}`}
        </p>
        <a
          href={profileMapHref(profile)}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 truncate text-[14px] font-normal leading-6 text-[#4B6B9A] underline-offset-2 transition hover:underline"
          title={isOwner ? profile.pisoDireccion ?? `${profile.zona}, ${profile.ciudad}` : `${profile.zona}, ${profile.ciudad}`}
        >
          {isOwner ? profile.pisoDireccion ?? `${profile.zona}, ${profile.ciudad}` : `${profile.zona}, ${profile.ciudad}`}
        </a>

        {isOwner && ownerCompanionCount > 0 ? (
          <p className="mt-1 truncate text-[13px] font-medium text-[#667085]">Viviras con {ownerCompanionCount} personas mas</p>
        ) : null}

        {isOwner && profile.companionPhotos.length ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {profile.companionPhotos.slice(0, 3).map((photo, index) => (
                <img
                  key={`${profile.id}-companion-photo-${index}`}
                  src={withFallbackImage(photo)}
                  alt={`companero-${index + 1}`}
                  className="h-7 w-7 rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
            {ownerCompanionCount > 3 ? (
              <span className="text-[12px] font-semibold text-[#6B7280]">+{ownerCompanionCount - 3}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          {profile.badgeTags.map((tag) => (
            <span
              key={`${profile.id}-${tag}`}
              className="truncate rounded-[999px] bg-[#F3F4F6] px-2 py-1 text-[12px] font-semibold text-[#4B5563]"
            >
              {tag}
            </span>
          ))}
        </div>

        {highlight ? (
          <div className="mt-3">
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

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Link
            href={`/profile/${profile.id}`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-3 text-[12px] font-semibold text-[#1F2937] transition hover:border-[#98A2B3] hover:bg-[#F9FAFB]"
          >
            Ver perfil
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                onAuthRequired();
                return;
              }

              window.location.assign(`/profile/${profile.id}?solicitar=1`);
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#FF6B6B] px-3 text-[12px] font-semibold text-white transition hover:bg-[#F45C5C]"
          >
            Solicitar
          </button>
        </div>
      </div>
    </article>
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
  isAuthenticated,
  onClose,
  onOpenChat,
  onAuthRequired,
}: {
  profile: ExploreProfile;
  isAuthenticated: boolean;
  onClose: () => void;
  onOpenChat: (userId: string) => void;
  onAuthRequired: () => void;
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
        className={`relative z-10 h-[92vh] w-full overflow-hidden rounded-t-3xl bg-[#F8FBFF] transition-all duration-300 sm:h-auto sm:max-h-[90vh] sm:w-[min(980px,94vw)] sm:rounded-3xl ${
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#06152D]/68 via-[#06152D]/15 to-transparent" />

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
                <div className="inline-flex rounded-full border border-white/40 bg-white/22 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur">
                  Compatibilidad {profile.compatibilidad}%
                </div>
                <h3 className="mt-2 text-[34px] font-black tracking-tight text-white">{profile.nombre}, {profile.edad}</h3>
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

          <div className="flex h-full flex-col overflow-y-auto bg-[#F8FBFF] p-6 sm:p-8">
            <div
              className={`flex items-center justify-between gap-3 transition-all duration-500 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "70ms" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0F766E]/10 px-3 py-2 text-[13px] font-semibold text-[#0F766E]">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#0F766E]" />
                  {profile.tienePiso ? "Tiene apartamento disponible" : "Busca apartamento"}
                </div>
                <span className="inline-flex items-center rounded-full bg-[#E8F1FF] px-3 py-1.5 text-[12px] font-semibold text-[#285AA1]">
                  {profile.verificado ? "✓ Verificada" : "Sin verificar"}
                </span>
              </div>
              <div className="rounded-2xl border border-[#FFD6CC] bg-[#FFF5F2] px-4 py-3 text-right text-[#7A2E2A] shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#A24A44]">{profile.userType === "propietario" ? "Precio habitacion" : "Presupuesto"}</p>
                <p className="text-[23px] font-black text-[#9F3D36]">{formatCurrency(budgetValue)}</p>
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
              <Link href={profileMapHref(profile)} className="mt-1 inline-block text-[13px] font-semibold text-[#285AA1] underline-offset-2 transition hover:underline">
                {profile.tienePiso
                  ? `Ver ubicacion: ${profile.pisoDireccion?.trim() || `${profile.zona}, ${profile.ciudad}`}`
                  : `Zona donde quiere vivir: ${profile.zona}, ${profile.ciudad}`}
              </Link>
              {profile.userType === "propietario" && (profile.companionCount || profile.pisoCompaneros || 0) > 0 ? (
                <p className="mt-1 text-[13px] text-[#52606D]">Viviras con {profile.companionCount || profile.pisoCompaneros} personas</p>
              ) : null}
              {hasUniversity ? (
                <p className="mt-1 text-[14px] text-[#52606D]">{profile.universidad}</p>
              ) : null}
            </div>

            {profile.userType === "propietario" && (profile.companionNames.length || profile.companionPhotos.length) ? (
              <div
                className={`mt-4 rounded-2xl border border-[#D6E4F1] bg-white p-4 transition-all duration-500 ${
                  entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
                style={{ transitionDelay: "195ms" }}
              >
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6C7A89]">Con quien viviras</p>
                {profile.companionPhotos.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.companionPhotos.map((photo, index) => (
                      <img
                        key={`${profile.id}-modal-companion-photo-${index}`}
                        src={withFallbackImage(photo)}
                        alt={profile.companionNames[index] ?? `companero-${index + 1}`}
                        className="h-12 w-12 rounded-xl border border-[#D9E3F0] object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                {profile.companionNames.length ? (
                  <p className="mt-2 text-[14px] text-[#334155]">{profile.companionNames.join(", ")}</p>
                ) : null}
              </div>
            ) : null}

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
              className={`sticky bottom-0 mt-5 flex flex-col gap-3 border-t border-[#E2E8F0] bg-[#F8FBFF]/95 pt-4 backdrop-blur transition-all duration-500 sm:flex-row ${
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: "280ms" }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onAuthRequired();
                    return;
                  }

                  window.location.assign(`/profile/${profile.id}?solicitar=1`);
                }}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#FF6B6B] px-5 text-[15px] font-bold text-white transition hover:bg-[#F45C5C]"
              >
                Enviar solicitud
              </button>
              <Link
                href={`/profile/${profile.id}`}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-5 text-[15px] font-bold text-[#334155] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
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
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, [number, number]>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const geocodeCacheRef = useRef<Record<string, [number, number]>>({});
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mappableProfiles = useMemo(() => profiles.filter((profile) => profile.tienePiso), [profiles]);

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
    let active = true;
    const controller = new AbortController();

    void (async () => {
      const next: Record<string, [number, number]> = {};

      await Promise.all(
        mappableProfiles.slice(0, 40).map(async (profile) => {
          const fallback = mapCoordinates(profile.ciudad, profile.zona, profile.id);
          const baseQuery = profileMapQuery(profile);
          const query = baseQuery.includes(profile.ciudad) ? baseQuery : `${baseQuery}, ${profile.ciudad}`;
          const cacheKey = normalizeText(query);

          if (geocodeCacheRef.current[cacheKey]) {
            next[profile.id] = geocodeCacheRef.current[cacheKey];
            return;
          }

          if (!token) {
            next[profile.id] = fallback;
            return;
          }

          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=false&types=address,neighborhood,place,locality&country=es&language=es&limit=1&access_token=${token}`,
              { signal: controller.signal },
            );

            const payload = (await response.json()) as {
              features?: Array<{ center?: [number, number] }>;
            };

            const centerPoint = payload.features?.[0]?.center;
            if (centerPoint && Array.isArray(centerPoint) && centerPoint.length === 2) {
              const resolved: [number, number] = [centerPoint[0], centerPoint[1]];
              geocodeCacheRef.current[cacheKey] = resolved;
              next[profile.id] = resolved;
              return;
            }

            next[profile.id] = fallback;
          } catch {
            next[profile.id] = fallback;
          }
        }),
      );

      if (active) {
        setResolvedCoordinates(next);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [mappableProfiles, token]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const stillVisible = mappableProfiles.some((profile) => profile.id === selected.id);
    if (!stillVisible) {
      setSelected(null);
    }
  }, [mappableProfiles, selected]);

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

      mappableProfiles.slice(0, 40).forEach((profile) => {
        const [lng, lat] = resolvedCoordinates[profile.id] ?? mapCoordinates(profile.ciudad, profile.zona, profile.id);
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
  }, [mapReady, mappableProfiles, resolvedCoordinates]);

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

      {!mappableProfiles.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/78 p-4 text-center">
          <p className="max-w-xs rounded-xl border border-[#E5E7EB] bg-white/95 px-4 py-3 text-[13px] font-semibold text-[#475467]" style={{ boxShadow: CARD_SHADOW }}>
            No hay perfiles con piso disponible para mostrar en el mapa con los filtros actuales.
          </p>
        </div>
      ) : null}

      {selected ? (
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[#E5E7EB] bg-white p-3" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-3">
            <img
              src={withFallbackImage(selected.fotoUrl)}
              alt={selected.nombre}
              className="h-14 w-14 rounded-xl object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-[#1A1A1A]">{selected.nombre}</p>
              <p className="text-[14px] font-bold text-[#FF6B6B]">{selected.compatibilidad}% de compatibilidad</p>
              {selected.tienePiso && selected.precioPiso ? (
                <p className="text-[12px] font-semibold text-[#1D4ED8]">Alquila por {shortPrice(selected.precioPiso)}</p>
              ) : null}
              <p className="truncate text-[12px] text-[#6B7280]">
                {selected.tienePiso
                  ? selected.pisoDireccion || `${selected.zona}, ${selected.ciudad}`
                  : `Busca piso en ${selected.zona}, ${selected.ciudad}`}
              </p>
            </div>
            <Link
              href={`/profile/${selected.id}`}
              className="inline-flex h-10 items-center rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-3 text-[13px] font-semibold text-[#1D2939] transition hover:bg-[#F3F4F6]"
            >
              Ver perfil
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ExploreScreen({
  isAuthenticated,
  currentUserId,
  currentUserName,
  initialCity,
  initialProfiles,
  openChatWithUserId,
  initialCelebration,
}: ExploreScreenProps) {
  const [cityQuery, setCityQuery] = useState(initialCity);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<ExploreProfile | null>(null);
  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false);
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(openChatWithUserId ?? null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE);
  const [openMenu, setOpenMenu] = useState<"tipo" | "habitos" | "perfil" | "precio" | null>(null);
  const filtersMenuRef = useRef<HTMLDivElement | null>(null);
  const cityPickerRef = useRef<HTMLDivElement | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Contact form state
  const [contactNombre, setContactNombre] = useState("");
  const [contactApellido, setContactApellido] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMensaje, setContactMensaje] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactEnviado, setContactEnviado] = useState(false);
  const [contactError, setContactError] = useState(false);

  async function handleContactSubmit() {
    setContactLoading(true);
    setContactEnviado(false);
    setContactError(false);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: contactNombre,
          apellido: contactApellido,
          email: contactEmail,
          mensaje: contactMensaje,
        }),
      });
      if (res.ok) {
        setContactEnviado(true);
        setContactNombre("");
        setContactApellido("");
        setContactEmail("");
        setContactMensaje("");
      } else {
        setContactError(true);
      }
    } catch {
      setContactError(true);
    } finally {
      setContactLoading(false);
    }
  }

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
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal='section']"));
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!initialCity) {
      return;
    }

    setCityQuery(initialCity);

    const normalizedInitial = normalizeText(initialCity);
    const cachedCenter = CITY_CENTER[normalizedInitial];
    if (cachedCenter) {
      setSelectedCity({
        id: initialCity,
        city: initialCity,
        label: `${initialCity}, Espana`,
        center: cachedCenter,
      });
      return;
    }

    let active = true;

    void (async () => {
      if (!mapboxToken) {
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(initialCity)}.json?autocomplete=true&types=place,locality&country=es&language=es&limit=1&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string; place_name?: string; center?: [number, number] }>;
        };

        const feature = payload.features?.[0];
        if (!active || !feature?.center) {
          return;
        }

        setSelectedCity({
          id: feature.id,
          city: feature.text ?? initialCity,
          label: feature.place_name ?? `${initialCity}, Espana`,
          center: [feature.center[0], feature.center[1]],
        });
      } catch {
        if (!active) return;
        setSelectedCity(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialCity, mapboxToken]);

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
    <main id="top" className="min-h-screen bg-[#F8F8F8] pr-16 text-[#1A1A1A] max-sm:pr-0">
      <SiteTopNav currentPath="/explore" />
      <div className="sticky top-[84px] z-30 bg-white" style={{ boxShadow: CARD_SHADOW }}>
        <header className="mx-auto max-w-7xl px-4 pt-3 pb-0 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div ref={cityPickerRef} className="relative w-full max-w-[560px]">
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
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-10 pr-10 text-[14px] font-normal text-[#1A1A1A] shadow-sm outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/10"
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

        <ExploreMap city={selectedCity?.city || cityQuery || initialCity} profiles={filteredProfiles} selectedCenter={selectedCity?.center ?? null} />
        <p className="mt-2 text-[12px] text-[#6B7280]">* Solo las personas que tienen piso aparecen en el mapa.</p>

        <section className="mt-6">
          <SectionTitle title="Tarjetas de ejemplo (4 casos)" count={EXAMPLE_CASE_CARDS.length} />
          <p className="mb-3 text-[13px] text-[#667085]">
            Vista previa para los cuatro escenarios: busca piso, busca para compartir, tiene piso solo y tiene piso con companeras.
          </p>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-4">
              {EXAMPLE_CASE_CARDS.map((profile, index) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  highlight
                  delay={index * 40}
                  isAuthenticated={isAuthenticated}
                  onAuthRequired={() => setIsAuthRequiredOpen(true)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle title="Mas compatibles contigo" count={featured.length} />
          {featured.length ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-4">
                {featured.map((profile, index) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    highlight
                    delay={index * 50}
                    isAuthenticated={isAuthenticated}
                    onAuthRequired={() => setIsAuthRequiredOpen(true)}
                  />
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
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    highlight={false}
                    delay={index * 50}
                    isAuthenticated={isAuthenticated}
                    onAuthRequired={() => setIsAuthRequiredOpen(true)}
                  />
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

      <section id="como-funciona" className="w-full bg-[#FFF4F1] px-4 py-14 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl pr-16 max-sm:pr-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B35C52]">Como funciona</p>
          <h2 className="mt-2 max-w-3xl text-[29px] font-bold leading-tight text-[#1A1A1A] sm:text-[36px]">
            Buscas, comparas y contactas en tres pasos claros
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-[#F3DEDA] bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F3D2CB] bg-[#FFF3EF] text-[14px] font-bold text-[#B35C52]">01</span>
              <h3 className="mt-3 text-[24px] font-semibold leading-snug text-[#0F766E]">Filtra tu busqueda</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#4B5563]">Ciudad, presupuesto y estilo de convivencia para ver solo perfiles que encajan.</p>
            </article>
            <article className="rounded-3xl border border-[#F3DEDA] bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F3D2CB] bg-[#FFF3EF] text-[14px] font-bold text-[#B35C52]">02</span>
              <h3 className="mt-3 text-[24px] font-semibold leading-snug text-[#0F766E]">Revisa compatibilidad</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#4B5563]">Compara habitos, ambiente y contexto del piso para decidir con informacion real.</p>
            </article>
            <article className="rounded-3xl border border-[#F3DEDA] bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F3D2CB] bg-[#FFF3EF] text-[14px] font-bold text-[#B35C52]">03</span>
              <h3 className="mt-3 text-[24px] font-semibold leading-snug text-[#0F766E]">Solicita contacto</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#4B5563]">Si te interesa, abres solicitud y continuais la conversacion en privado.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="contacto" className="w-full bg-[#F7F8FC] px-4 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl pr-16 max-sm:pr-0 grid gap-12 lg:grid-cols-2">
          {/* Info */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B4CF6]">Contacto</p>
            <h2 className="mt-3 text-[42px] font-bold leading-[1.05] text-[#1A1F55] sm:text-[56px]">Hagamos match con tu nuevo hogar</h2>
            <p className="mt-5 max-w-lg text-[17px] leading-8 text-[#2E355F]">
              Cuéntanos tu situación y te ayudamos a encontrar un piso y una convivencia que de verdad encaje contigo.
            </p>

            <div className="mt-8 space-y-2 text-[18px] text-[#2F3560]">
              <p>Calle Fray Antonio Alcala 10, 44100 Guadalajara, Jal., Mexico</p>
              <p>perfectossdesconocidoss@gmail.com</p>
              <p>Telefono: +34 911 00 00 00</p>
            </div>

            <div className="mt-8 flex items-center gap-3 text-[#0F172A]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">in</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">f</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">x</span>
            </div>
          </div>

          {/* Form */}
          <div className="grid gap-6 self-start">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-[15px] font-medium text-[#2E3560]">
                Nombre *
                <input
                  type="text"
                  value={contactNombre}
                  onChange={(e) => setContactNombre(e.target.value)}
                  className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                />
              </label>
              <label className="text-[15px] font-medium text-[#2E3560]">
                Apellido *
                <input
                  type="text"
                  value={contactApellido}
                  onChange={(e) => setContactApellido(e.target.value)}
                  className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                />
              </label>
            </div>

            <label className="text-[15px] font-medium text-[#2E3560]">
              Email *
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
              />
            </label>

            <label className="text-[15px] font-medium text-[#2E3560]">
              Déjanos un mensaje...
              <textarea
                rows={4}
                value={contactMensaje}
                onChange={(e) => setContactMensaje(e.target.value)}
                className="mt-3 w-full resize-none border-0 border-b border-[#AAB1D1] bg-transparent px-0 py-1 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
              />
            </label>

            {contactEnviado && (
              <p className="text-[14px] font-semibold text-green-600">¡Mensaje enviado! Te responderemos pronto.</p>
            )}
            {contactError && (
              <p className="text-[14px] font-semibold text-red-600">Error al enviar. Inténtalo de nuevo.</p>
            )}

            <div>
              <button
                type="button"
                disabled={contactLoading}
                onClick={handleContactSubmit}
                className="inline-flex min-h-12 min-w-40 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#9A4BFF_0%,#7E3AF2_100%)] px-8 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(126,58,242,0.30)] transition hover:opacity-90 disabled:opacity-60"
              >
                {contactLoading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <ChatDock
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        openChatWithUserId={chatTargetUserId}
        initialCelebration={initialCelebration}
      />

      {expandedProfile ? (
        <ProfileExpandedModal
          profile={expandedProfile}
          isAuthenticated={isAuthenticated}
          onClose={() => setExpandedProfile(null)}
          onOpenChat={openChatForProfile}
          onAuthRequired={() => setIsAuthRequiredOpen(true)}
        />
      ) : null}

      {isAuthRequiredOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-[#F0D8D3] bg-[#FFF8F5] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B35C52]">Necesitas cuenta</p>
                <h2 className="mt-2 text-[22px] font-semibold text-[#1F2937]">Crea tu cuenta para contactar</h2>
                <p className="mt-1 text-[14px] leading-6 text-[#6B7280]">
                  Para contactar con esta persona necesitas crear una cuenta. Es gratis y solo tarda 2 minutos.
                </p>
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
                onClick={() => smoothScrollToHash("#como-funciona", 160)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#FF6B6B] px-4 text-[15px] font-semibold text-white"
              >
                Como funciona
              </button>
              <button
                type="button"
                onClick={() => smoothScrollToHash("#contacto", 160)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-4 text-[15px] font-semibold text-[#4B5563]"
              >
                Contacto
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
