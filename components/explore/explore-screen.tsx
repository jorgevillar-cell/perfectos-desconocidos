"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import Link from "next/link";
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
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  presupuesto: number;
  tienePiso: boolean;
  precioPiso: number | null;
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
  soloEstudiantes: boolean;
  soloTrabajadores: boolean;
};

const INITIAL_FILTERS: FilterState = {
  tienePiso: false,
  buscaHabitacion: false,
  buscaCompanero: false,
  fumador: false,
  aceptaMascotas: false,
  madrugador: false,
  nocturno: false,
  soloEstudiantes: false,
  soloTrabajadores: false,
};

const CARD_BG = "#FFFFFF";
const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.08)";
const CARD_HOVER_SHADOW = "0 8px 24px rgba(0,0,0,0.12)";

const CITY_CENTER: Record<string, [number, number]> = {
  madrid: [-3.7038, 40.4168],
  barcelona: [2.1734, 41.3851],
  valencia: [-0.3763, 39.4699],
  sevilla: [-5.9845, 37.3891],
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

const CHIP_BASE =
  "inline-flex h-10 items-center rounded-[999px] border px-4 text-[14px] font-semibold transition-colors duration-150";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
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
      className={`${CHIP_BASE} active:scale-[0.98] ${
        active
          ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
          : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF6B6B]/45"
      }`}
    >
      {label}
    </button>
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
}: {
  profile: ExploreProfile;
  highlight: boolean;
  delay: number;
}) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Link href={`/profile/${profile.id}`} className="block">
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
          <span className="absolute right-3 top-3 rounded-[999px] bg-[#FF6B6B] px-3 py-1 text-[14px] font-bold text-white">
            {profile.compatibilidad}%
          </span>
        </div>

        <div className="flex h-[209px] flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[16px] font-semibold text-[#1A1A1A]">
              {profile.nombre}, {profile.edad}
            </p>
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
              <div className="h-2 overflow-hidden rounded-[999px] bg-[#FFE5E5]">
                <div
                  className="h-full rounded-[999px] bg-[#FF6B6B] transition-all duration-700 ease-out"
                  style={{ width: filled ? `${profile.compatibilidad}%` : "0%" }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </Link>
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
}: {
  city: string;
  profiles: ExploreProfile[];
}) {
  const [selected, setSelected] = useState<ExploreProfile | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const center = useMemo(() => CITY_CENTER[normalizeText(city)] ?? CITY_CENTER.madrid, [city]);

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
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 11,
      });

      mapRef.current.on("load", () => {
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
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [expandedPrice, setExpandedPrice] = useState(false);
  const [hasActiveFiltering, setHasActiveFiltering] = useState(false);

  const filteredProfiles = useMemo(() => {
    if (!hasActiveFiltering) {
      return initialProfiles;
    }

    const search = normalizeText(cityQuery);

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
      if (filters.soloEstudiantes && !normalizeText(profile.estudiaOTrabaja).includes("estudiante")) return false;
      if (filters.soloTrabajadores && !normalizeText(profile.estudiaOTrabaja).includes("trabajador")) return false;

      const comparablePrice = profile.precioPiso ?? profile.presupuesto;
      return comparablePrice <= maxPrice;
    });
  }, [cityQuery, filters, hasActiveFiltering, initialProfiles, maxPrice]);

  const featured = useMemo(
    () => filteredProfiles.filter((profile) => profile.compatibilidad >= 70).sort((a, b) => b.compatibilidad - a.compatibilidad),
    [filteredProfiles],
  );

  const others = useMemo(
    () => filteredProfiles.filter((profile) => profile.compatibilidad < 70).sort((a, b) => b.compatibilidad - a.compatibilidad),
    [filteredProfiles],
  );

  function toggleFilter(key: keyof FilterState) {
    setHasActiveFiltering(true);
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateCityQuery(value: string) {
    setCityQuery(value);
    setHasActiveFiltering(value.trim().length > 0 || hasActiveFiltering);
  }

  function updateMaxPrice(value: number) {
    setHasActiveFiltering(true);
    setMaxPrice(value);
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] pl-16 text-[#1A1A1A] max-sm:pl-0">
      <div className="sticky top-0 z-30 bg-white" style={{ boxShadow: CARD_SHADOW }}>
        <header className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-[160px] text-[16px] font-semibold text-[#FF6B6B]">Perfectos Desconocidos</div>

          <div className="flex flex-1 items-center justify-center">
            <label className="relative w-full max-w-[420px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                value={cityQuery}
                onChange={(event) => updateCityQuery(event.target.value)}
                placeholder="Buscar por ciudad"
                className="h-10 w-full rounded-[10px] border border-[#E5E7EB] bg-[#F8F8F8] pl-10 pr-3 text-[14px] font-normal text-[#1A1A1A] outline-none transition focus:border-[#FF6B6B]"
              />
            </label>
          </div>

        </header>

        <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-max items-center gap-2">
            <span className="text-[14px] font-semibold text-[#6B7280]">Tipo</span>
            <FilterChip active={filters.tienePiso} label="Tiene piso" onClick={() => toggleFilter("tienePiso")} />
            <FilterChip active={filters.buscaHabitacion} label="Busca habitacion" onClick={() => toggleFilter("buscaHabitacion")} />
            <FilterChip active={filters.buscaCompanero} label="Busca companero" onClick={() => toggleFilter("buscaCompanero")} />

            <span className="ml-2 text-[14px] font-semibold text-[#6B7280]">Habitos</span>
            <FilterChip active={filters.fumador} label="Fumador" onClick={() => toggleFilter("fumador")} />
            <FilterChip active={filters.aceptaMascotas} label="Acepta mascotas" onClick={() => toggleFilter("aceptaMascotas")} />
            <FilterChip active={filters.madrugador} label="Madrugador" onClick={() => toggleFilter("madrugador")} />
            <FilterChip active={filters.nocturno} label="Nocturno" onClick={() => toggleFilter("nocturno")} />

            <span className="ml-2 text-[14px] font-semibold text-[#6B7280]">Perfil</span>
            <FilterChip active={filters.soloEstudiantes} label="Solo estudiantes" onClick={() => toggleFilter("soloEstudiantes")} />
            <FilterChip active={filters.soloTrabajadores} label="Solo trabajadores" onClick={() => toggleFilter("soloTrabajadores")} />

            <button
              type="button"
              onClick={() => setExpandedPrice((prev) => !prev)}
              className={`${CHIP_BASE} active:scale-[0.98] border-[#E5E7EB] bg-white text-[#1A1A1A]`}
            >
              Precio max: {formatCurrency(maxPrice)}
            </button>
          </div>

          {expandedPrice ? (
            <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
              <input
                type="range"
                min={400}
                max={2200}
                step={50}
                value={maxPrice}
                onChange={(event) => updateMaxPrice(Number(event.target.value))}
                className="w-full accent-[#FF6B6B]"
              />
              <p className="mt-2 text-[14px] font-semibold text-[#1A1A1A]">Hasta {formatCurrency(maxPrice)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <ExploreMap city={cityQuery || initialCity} profiles={filteredProfiles} />

        <section className="mt-6">
          <SectionTitle title="Mas compatibles contigo" count={featured.length} />
          {featured.length ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-4">
                {featured.map((profile, index) => (
                  <ProfileCard key={profile.id} profile={profile} highlight delay={index * 50} />
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
                  <ProfileCard key={profile.id} profile={profile} highlight={false} delay={index * 50} />
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
        openChatWithUserId={openChatWithUserId}
        initialCelebration={initialCelebration}
      />
    </main>
  );
}
