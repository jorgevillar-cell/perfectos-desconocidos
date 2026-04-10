import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProfileLocationMap } from "@/components/profile/profile-location-map";
import { RequestContactButton } from "@/components/profile/request-contact-button";
import { SaveProfileButton } from "@/components/profile/save-profile-button";
import { AdBanner } from "@/components/ads/ad-banner";
import { getDemoProfiles } from "@/lib/explore/demo-profiles";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RawProfile = {
  situacion: string;
  estudiaOTrabaja: string;
  universidad: string | null;
  presupuesto: number | string;
  zonas: string[];
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
};

type RawPiso = {
  id?: string;
  precio: number | string;
  zona: string;
  direccion?: string | null;
  descripcion: string;
  disponibleDesde: string;
  gastosIncluidos: boolean;
  fotos: string[];
  companeros_piso?: RawCompanion[] | null;
};

type RawCompanion = {
  nombre: string;
  fotoUrl: string | null;
  edad: number | null;
  estudiaOTrabaja: string | null;
  horario: string | null;
  fumar: string | null;
  mascotas: string | null;
  ambiente: string | null;
  descripcion: string | null;
};

type RawUser = {
  id: string;
  tipo_usuario?: string | null;
  nombre: string;
  edad: number;
  pais: string;
  ciudad: string;
  idiomas: string[];
  fotoUrl: string | null;
  bio: string | null;
  verificado: boolean;
  perfil_convivencia: RawProfile | RawProfile[] | null;
  pisos: RawPiso[] | null;
};

type ComparisonState = "green" | "yellow" | "gray";

type ComparisonItem = {
  label: string;
  mine: string;
  target: string;
  state: ComparisonState;
};

type ListingGalleryProps = {
  images: string[];
  title: string;
};

type ListingSummaryProps = {
  title: string;
  metaLine: string;
  chips: string[];
};

type ListingDescriptionProps = {
  title?: string;
  text: string;
};

type ListingNormsProps = {
  items: string[];
};

type CompatibilitySectionProps = {
  score: number;
  rows: ComparisonItem[];
  companionCompatibilityRows?: Array<{
    name: string;
    matches: string[];
    mismatches: string[];
  }>;
};

type SidebarContactCardProps = {
  profileName: string;
  age: number;
  city: string;
  zone: string;
  role: string;
  language: string;
  photoUrl: string;
  verified: boolean;
  isAvailableNow: boolean;
  price: number;
  hasPiso: boolean;
  quickFacts: string[];
  mapAddress: string | null;
  actionSlot: ReactNode;
  secondaryActionSlot: ReactNode;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function firstProfile(profile: RawUser["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile;
}

function withFallback(url: string | null) {
  if (url?.trim()) return url;
  return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80";
}

function toSituacionLabel(value: string) {
  if (value.includes("tengo_piso")) return "Tiene piso";
  if (value.includes("busco_habitacion")) return "Busca habitacion";
  if (value.includes("buscar_juntos")) return "Busca compañero";
  return value.replaceAll("_", " ");
}

function toRoleLabel(value: string) {
  const normalized = value.replaceAll("_", " ").trim();
  if (!normalized) return "Sin definir";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function budgetState(mine: number, target: number): ComparisonState {
  const maxValue = Math.max(mine, target, 1);
  const diff = Math.abs(mine - target) / maxValue;
  if (diff <= 0.1) return "green";
  if (diff <= 0.2) return "yellow";
  return "gray";
}

function horarioState(mine: string, target: string): ComparisonState {
  const mineNormalized = normalize(mine);
  const targetNormalized = normalize(target);

  if (mineNormalized === targetNormalized) return "green";
  if (mineNormalized.includes("normal") || targetNormalized.includes("normal")) return "yellow";
  return "gray";
}

function ambienteState(mine: string, target: string): ComparisonState {
  const mineNormalized = normalize(mine);
  const targetNormalized = normalize(target);

  if (mineNormalized === targetNormalized) return "green";
  if (mineNormalized.includes("equilibr") || targetNormalized.includes("equilibr")) return "yellow";
  return "gray";
}

function hobbiesState(mine: RawProfile, target: RawProfile): ComparisonState {
  const mineHobbies = new Set((mine.aficiones ?? []).map((item) => normalize(item)));
  const targetHobbies = (target.aficiones ?? []).map((item) => normalize(item));
  const shared = targetHobbies.filter((item) => mineHobbies.has(item)).length;

  if (normalize(mine.deporte) === normalize(target.deporte) || shared >= 2) return "green";
  if (shared >= 1) return "yellow";
  return "gray";
}

function compatibilityScore(mine: RawProfile, target: RawProfile) {
  let total = 0;

  if (mine.fumar === target.fumar) total += 20;
  if (normalize(mine.horario) === normalize(target.horario)) total += 20;
  if (normalize(mine.ambiente) === normalize(target.ambiente)) total += 15;
  if (mine.mascotas === target.mascotas) total += 15;

  const sameUniversity =
    !!mine.universidad &&
    !!target.universidad &&
    normalize(mine.universidad) === normalize(target.universidad);
  if (sameUniversity) total += 15;

  if (budgetState(parseNumber(mine.presupuesto), parseNumber(target.presupuesto)) !== "gray") {
    total += 10;
  }

  if (hobbiesState(mine, target) !== "gray") {
    total += 5;
  }

  return Math.max(0, Math.min(100, Math.round(total)));
}

function compatibilityLabel(score: number) {
  if (score >= 80) return "Alta compatibilidad";
  if (score >= 65) return "Buena compatibilidad";
  if (score >= 45) return "Compatibilidad media";
  return "Poca compatibilidad";
}

function boolText(value: boolean) {
  return value ? "si" : "no";
}

function parseCompanerosFromDescription(description: string | null | undefined) {
  const value = description ?? "";
  const match = value.match(/\[PD_META_COMPANEROS:(\d+)\]/i);
  if (!match) return null;
  return Number(match[1] ?? "0") || null;
}

function cleanPisoDescription(description: string | null | undefined) {
  return (description ?? "").replace(/^\[PD_META_COMPANEROS:\d+\]\s*/i, "").trim();
}

function chipFromProfile(profile: RawProfile) {
  return [
    `Horario ${profile.horario}`,
    profile.fumar ? "Fuma" : "No fuma",
    profile.mascotas ? "Mascotas" : "Sin mascotas",
    `Ambiente ${profile.ambiente}`,
    `Deporte ${profile.deporte}`,
  ];
}

function comparisonBadgeClass(state: ComparisonState) {
  if (state === "green") return "border-[#22C55E] bg-[#DCFCE7] text-[#166534]";
  if (state === "yellow") return "border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]";
  return "border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]";
}

function comparisonRows(mine: RawProfile, target: RawProfile): ComparisonItem[] {
  const mineBudget = parseNumber(mine.presupuesto);
  const targetBudget = parseNumber(target.presupuesto);

  const sameUniversity =
    !!mine.universidad &&
    !!target.universidad &&
    normalize(mine.universidad) === normalize(target.universidad);
  const bothUniversity = !!mine.universidad && !!target.universidad;

  return [
    {
      label: "Fumar",
      target: `Ella: ${target.fumar ? "fuma" : "no fuma"}`,
      mine: `Tu: ${mine.fumar ? "fumas" : "no fumas"}`,
      state: mine.fumar === target.fumar ? "green" : "gray",
    },
    {
      label: "Horario de vida",
      target: `Ella: ${target.horario}`,
      mine: `Tu: ${mine.horario}`,
      state: horarioState(mine.horario, target.horario),
    },
    {
      label: "Ambiente en casa",
      target: `Ella: ${target.ambiente}`,
      mine: `Tu: ${mine.ambiente}`,
      state: ambienteState(mine.ambiente, target.ambiente),
    },
    {
      label: "Mascotas",
      target: `Ella: ${target.mascotas ? "acepta mascotas" : "no acepta mascotas"}`,
      mine: `Tu: ${mine.mascotas ? "aceptas mascotas" : "no aceptas mascotas"}`,
      state: mine.mascotas === target.mascotas ? "green" : "gray",
    },
    {
      label: "Universidad",
      target: `Ella: ${target.universidad ?? "sin dato"}`,
      mine: `Tu: ${mine.universidad ?? "sin dato"}`,
      state: sameUniversity ? "green" : bothUniversity ? "yellow" : "gray",
    },
    {
      label: "Presupuesto",
      target: `Ella: ${formatEuro(targetBudget)}`,
      mine: `Tu: ${formatEuro(mineBudget)}`,
      state: budgetState(mineBudget, targetBudget),
    },
    {
      label: "Deporte y aficiones",
      target: `Ella: ${target.deporte}`,
      mine: `Tu: ${mine.deporte}`,
      state: hobbiesState(mine, target),
    },
  ];
}

function companionsCompatibilityRows(mine: RawProfile | null, companions: RawCompanion[]) {
  if (!companions.length) {
    return [] as Array<{ name: string; matches: string[]; mismatches: string[] }>;
  }

  return companions.map((item, index) => {
    const matches: string[] = [];
    const mismatches: string[] = [];

    if (!mine) {
      mismatches.push("Inicia sesion para comparar");
      return {
        name: item.nombre?.trim() || `Companero ${index + 1}`,
        matches,
        mismatches,
      };
    }

    const horarioMatch = normalize(mine.horario) === normalize(item.horario);
    const ambienteMatch = normalize(mine.ambiente) === normalize(item.ambiente);
    const fumarMatch = (mine.fumar ? "si" : "no") === normalize(item.fumar);

    const mineMascotas = mine.mascotas ? "acepto" : "no_acepto";
    const mateMascotas = normalize(item.mascotas);
    const mascotasMatch =
      mineMascotas === mateMascotas ||
      (mineMascotas === "acepto" && mateMascotas === "tengo") ||
      (mineMascotas === "no_acepto" && mateMascotas === "no_acepto");

    (horarioMatch ? matches : mismatches).push("horario");
    (fumarMatch ? matches : mismatches).push("fumar");
    (mascotasMatch ? matches : mismatches).push("mascotas");
    (ambienteMatch ? matches : mismatches).push("ambiente");

    return {
      name: item.nombre?.trim() || `Companero ${index + 1}`,
      matches,
      mismatches,
    };
  });
}

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  if (name === "pin") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-4.8" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 10 9-7 9 7" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h16v10H8l-4 4V5Z" />
      </svg>
    );
  }

  if (name === "bookmark") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4h12v16l-6-3-6 3V4Z" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ListingHeaderGallery({ images, title }: ListingGalleryProps) {
  const fallback = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80";
  const gallery = [images[0], images[1], images[2]].map((item) => item || fallback);

  return (
    <section className="rounded-3xl border border-[#E5EAF2] bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-4">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl">
          <img src={gallery[0]} alt={title} className="h-[280px] w-full object-cover sm:h-[360px]" loading="lazy" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
          <button type="button" className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[#0F172A]">
            <Icon name="home" className="h-3.5 w-3.5" />
            Ver fotos
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
          <img src={gallery[1]} alt="Vista del piso" className="h-[136px] w-full rounded-2xl object-cover sm:h-[173px]" loading="lazy" />
          <div className="relative overflow-hidden rounded-2xl">
            <img src={gallery[2]} alt="Zona comun" className="h-[136px] w-full object-cover sm:h-[173px]" loading="lazy" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-3">
              <span className="inline-flex rounded-full bg-white/92 px-2.5 py-1 text-[12px] font-semibold text-[#0F172A]">+12 fotos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileHeroPhoto({
  imageUrl,
  name,
  age,
  city,
  country,
  role,
}: {
  imageUrl: string;
  name: string;
  age: number;
  city: string;
  country: string;
  role: string;
}) {
  return (
    <section className="rounded-3xl border border-[#E5EAF2] bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-4">
      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#24272B]">
        <div className="relative">
          <img src={imageUrl} alt={name} className="h-[200px] w-full object-cover object-[center_18%] sm:h-[250px]" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/8" />
        </div>
        <div className="p-4">
          <p className="text-[32px] font-bold leading-none text-white">{name}, {age}</p>
          <p className="mt-1 text-[14px] text-white/85">{city} - {country} · {toRoleLabel(role)}</p>
        </div>
      </div>
    </section>
  );
}

function ListingSummary({ title, metaLine, chips }: ListingSummaryProps) {
  return (
    <section className="mt-5 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-6">
      <h1 className="text-[26px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">{title}</h1>
      <p className="mt-2 text-[15px] text-[#556070]">{metaLine}</p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full border border-[#DCE6F4] bg-[#F7FAFF] px-3 py-1.5 text-[13px] font-medium text-[#31435F]">
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}

function ListingTabs({ showMap }: { showMap: boolean }) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-[#E5EAF2] bg-white p-2">
      <a href="#descripcion" className="rounded-xl bg-[#0F172A] px-4 py-2 text-[13px] font-semibold text-white">Descripcion</a>
      <a href="#normas" className="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#475467] transition hover:bg-[#F3F5F8]">Normas</a>
      <a href="#compatibilidad" className="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#475467] transition hover:bg-[#F3F5F8]">Compatibilidad</a>
      {showMap ? <a href="#mapa" className="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#475467] transition hover:bg-[#F3F5F8]">Mapa</a> : null}
    </nav>
  );
}

function ListingDescription({ title = "Sobre el piso y la convivencia", text }: ListingDescriptionProps) {
  return (
    <section id="descripcion" className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-[22px] font-semibold text-[#0F172A]">{title}</h2>
      <p className="mt-3 text-[16px] leading-8 text-[#344054]">{text}</p>
    </section>
  );
}

function ListingNorms({ items }: ListingNormsProps) {
  return (
    <section id="normas" className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-[22px] font-semibold text-[#0F172A]">Normas y detalles</h2>
      <ul className="mt-4 space-y-3 text-[15px] text-[#344054]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-1 text-[#10B981]"><Icon name="check" className="h-4 w-4" /></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatAvailability(value: string | null | undefined) {
  if (!value) return "Por acordar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Por acordar";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(date);
}

function HousingOrSearchSection({
  hasPiso,
  price,
  zone,
  city,
  availableFrom,
  companionsCount,
  description,
  zones,
}: {
  hasPiso: boolean;
  price: number;
  zone: string;
  city: string;
  availableFrom: string | null | undefined;
  companionsCount: number;
  description: string;
  zones: string[];
}) {
  if (hasPiso) {
    return (
      <section className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#667085]">El piso</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFD] px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Precio habitacion:</span> {formatEuro(price)}/mes</div>
          <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFD] px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Zona:</span> {zone}, {city}</div>
          <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFD] px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Disponible desde:</span> {formatAvailability(availableFrom)}</div>
          <div className="rounded-xl border border-[#E8EDF5] bg-[#F8FAFD] px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Companeros actuales:</span> {companionsCount > 0 ? companionsCount : "Vive solo"}</div>
        </div>
        <p className="mt-3 text-[15px] leading-7 text-[#344054]">{description}</p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-3xl border border-[#E5EAF2] bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FBFF_100%)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Lo que busca</p>
        <span className="rounded-full border border-[#DCE6F4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3B4A66]">Datos onboarding</span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-[#E8EDF5] bg-white px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Presupuesto maximo:</span> {formatEuro(price)}/mes</div>
        <div className="rounded-xl border border-[#E8EDF5] bg-white px-3 py-2.5 text-[14px] text-[#344054]"><span className="font-semibold">Ciudad objetivo:</span> {city}</div>
        <div className="rounded-xl border border-[#E8EDF5] bg-white px-3 py-2.5 text-[14px] text-[#344054] sm:col-span-2"><span className="font-semibold">Tipo:</span> Habitacion o compartir piso</div>
      </div>
      {zones.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {zones.map((item) => (
            <span key={item} className="rounded-full border border-[#DDE6F2] bg-white px-3 py-1.5 text-[13px] font-medium text-[#334155]">{item}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LivingStyleGrid({ profile }: { profile: RawProfile }) {
  return (
    <section className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-[22px] font-semibold text-[#0F172A]">Forma de vivir</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Fuma</p><p className="font-semibold">{profile.fumar ? "Si" : "No"}</p></div>
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Horario</p><p className="font-semibold">{profile.horario}</p></div>
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Ambiente</p><p className="font-semibold">{profile.ambiente}</p></div>
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Mascotas</p><p className="font-semibold">{profile.mascotas ? "Acepta" : "No acepta"}</p></div>
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Deporte</p><p className="font-semibold">{profile.deporte}</p></div>
        <div className="rounded-xl bg-[#F8FAFD] p-3 text-[14px]"><p className="text-[#667085]">Universidad</p><p className="font-semibold">{profile.universidad ?? "Sin dato"}</p></div>
      </div>
    </section>
  );
}

function LivingWithSection({ companions }: { companions: RawCompanion[] }) {
  if (!companions.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-[22px] font-semibold text-[#0F172A]">Con quien viviras</h2>
      <div className="mt-4 space-y-3">
        {companions.map((item, index) => (
          <article key={`${item.nombre}-${index}`} className="rounded-2xl border border-[#E6EAF0] bg-[#FAFBFD] p-4">
            <div className="flex items-center gap-3">
              <img
                src={withFallback(item.fotoUrl)}
                alt={item.nombre || `Companero ${index + 1}`}
                className="h-12 w-12 rounded-xl object-cover"
                loading="lazy"
              />
              <p className="text-[16px] font-semibold text-[#101828]">{item.nombre}{item.edad ? `, ${item.edad}` : ""}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
              {item.horario ? <span className="rounded-full border border-[#DDE6F2] bg-white px-2.5 py-1">Horario: {item.horario}</span> : null}
              {item.fumar ? <span className="rounded-full border border-[#DDE6F2] bg-white px-2.5 py-1">Fumar: {item.fumar}</span> : null}
              {item.mascotas ? <span className="rounded-full border border-[#DDE6F2] bg-white px-2.5 py-1">Mascotas: {item.mascotas}</span> : null}
              {item.ambiente ? <span className="rounded-full border border-[#DDE6F2] bg-white px-2.5 py-1">Ambiente: {item.ambiente}</span> : null}
            </div>
            {item.descripcion?.trim() ? <p className="mt-2 text-[14px] text-[#475467]">{item.descripcion}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CompatibilitySection({ score, rows, companionCompatibilityRows = [] }: CompatibilitySectionProps) {
  const matchedRows = rows.filter((row) => row.state !== "gray");
  const reviewRows = rows.filter((row) => row.state === "gray");

  return (
    <section id="compatibilidad" className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Compatibilidad personal</p>
          <p className="mt-1 text-[34px] font-bold leading-none text-[#0F172A]">{score}%</p>
        </div>
        <p className="max-w-[420px] text-[14px] leading-6 text-[#667085]">
          Analisis de habitos y estilo de convivencia para tomar una decision informada antes de contactar.
        </p>
      </div>

      <div className="mt-4 h-3 rounded-full bg-[#EEF2F7]">
        <div className="h-3 rounded-full bg-gradient-to-r from-[#27B88E] to-[#57C3A4]" style={{ width: `${score}%` }} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#D7EEDF] bg-[linear-gradient(180deg,#F7FDF9_0%,#EEFBF3_100%)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#1A7F5A]">Coincidencias clave</p>
            <span className="rounded-full bg-[#DBF5E8] px-2.5 py-1 text-[11px] font-semibold text-[#1A7F5A]">Match</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {matchedRows.length ? (
              matchedRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-[#CCE8DA] bg-white p-3 text-[14px] text-[#1D2939] shadow-[0_2px_10px_rgba(16,24,40,0.04)]">
                  <p className="font-semibold text-[#0E3B2F]">{row.label}</p>
                  <p className="mt-1 text-[13px] text-[#475467]">{row.target}</p>
                  <p className="text-[12px] text-[#1A7F5A]">{row.mine}</p>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-[#475467]">Aun no hay suficientes datos para comparar coincidencias.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ECEFF3] bg-[#FAFBFC] p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#475467]">Puntos a revisar</p>
          <div className="mt-3 space-y-2.5">
            {reviewRows.length ? (
              reviewRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-[#E4E7EC] bg-white p-3 text-[14px] text-[#1D2939]">
                  <p className="font-semibold">{row.label}</p>
                  <p className="mt-1 text-[13px] text-[#475467]">{row.target}</p>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-[#475467]">No se detectan puntos criticos para revisar.</p>
            )}
          </div>
        </div>
      </div>

      {companionCompatibilityRows.length ? (
        <div className="mt-6 rounded-2xl border border-[#E6EAF0] bg-[#FAFBFD] p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#475467]">Compatibilidad con los companeros</p>
          <div className="mt-3 space-y-3">
            {companionCompatibilityRows.map((companion) => (
              <div key={companion.name} className="rounded-xl border border-[#E4E7EC] bg-white p-3">
                <p className="text-[14px] font-semibold text-[#1D2939]">{companion.name}</p>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#1A7F5A]">Coincide en: {companion.matches.join(", ") || "-"}</p>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#B54708]">A revisar: {companion.mismatches.join(", ") || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MapSection({ area, address, city, zone }: { area: string; address: string; city: string; zone: string }) {
  return (
    <section id="mapa" className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-[22px] font-semibold text-[#0F172A]">Ubicacion</h2>
      <p className="mt-2 text-[14px] text-[#667085]">Ubicacion del piso en {area}.</p>
      <ProfileLocationMap address={address} city={city} zone={zone} />
    </section>
  );
}

function ProfileSummaryCard({
  profileName,
  age,
  city,
  zone,
  role,
  language,
  photoUrl,
  verified,
}: {
  profileName: string;
  age: number;
  city: string;
  zone: string;
  role: string;
  language: string;
  photoUrl: string;
  verified: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-[#F9FBFF] p-4">
      <div className="flex items-center gap-3">
        <img src={photoUrl} alt={profileName} className="h-14 w-14 rounded-xl object-cover" loading="lazy" />
        <div>
          <p className="text-[16px] font-semibold text-[#101828]">{profileName}, {age}</p>
          <p className="text-[13px] text-[#667085]">{zone}, {city}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[13px] text-[#475467]">
        <p className="flex items-center gap-2"><Icon name="user" className="h-4 w-4" />{role}</p>
        <p className="flex items-center gap-2"><Icon name="message" className="h-4 w-4" />Idioma principal: {language}</p>
        <p className="flex items-center gap-2"><Icon name="check" className="h-4 w-4" />{verified ? "Perfil verificado" : "Perfil pendiente de verificar"}</p>
      </div>
    </div>
  );
}

function QuickFacts({ items }: { items: string[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-[#E6EAF0] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Ficha rapida</p>
      <ul className="mt-3 space-y-2.5 text-[14px] text-[#344054]">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-[#64748B]"><Icon name="check" className="h-4 w-4" /></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniMapCard({ area }: { area: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white">
      <div className="h-[140px] bg-[linear-gradient(135deg,#EEF4FF_0%,#F7FAFC_50%,#E8EEF8_100%)]" />
      <div className="border-t border-[#E6EAF0] px-4 py-3 text-[13px] text-[#475467]">
        <p className="inline-flex items-center gap-2 font-medium"><Icon name="pin" className="h-4 w-4" />Ubicacion aproximada</p>
        <p className="mt-1 text-[#667085]">{area}</p>
      </div>
    </div>
  );
}

function ExactPisoMapCard({
  address,
  city,
  zone,
  photoUrl,
}: {
  address: string;
  city: string;
  zone: string;
  photoUrl: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white">
      <div className="px-4 pt-3 text-[13px] text-[#475467]">
        <p className="inline-flex items-center gap-2 font-medium"><Icon name="pin" className="h-4 w-4" />Ubicacion exacta del piso</p>
        <p className="mt-1 text-[#667085]">{address}</p>
      </div>
      <ProfileLocationMap address={address} city={city} zone={zone} markerImageUrl={photoUrl} compact className="mt-3" />
    </div>
  );
}

function SidebarContactCard({
  profileName,
  age,
  city,
  zone,
  role,
  language,
  photoUrl,
  verified,
  isAvailableNow,
  price,
  hasPiso,
  quickFacts,
  mapAddress,
  actionSlot,
  secondaryActionSlot,
}: SidebarContactCardProps) {
  return (
    <aside className="rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] lg:sticky lg:top-5">
      <div>
        <p className="text-[36px] font-bold leading-none text-[#101828]">{formatEuro(price)}</p>
        <p className="mt-1 text-[14px] text-[#667085]">por mes · gastos segun anuncio</p>
      </div>

      <div className="mt-4 space-y-2 text-[14px] text-[#344054]">
        <p className="flex items-center gap-2"><span className="text-[#10B981]"><Icon name="check" className="h-4 w-4" /></span>{isAvailableNow ? "Disponible ahora" : "Consulta disponibilidad"}</p>
        <p className="flex items-center gap-2"><span className="text-[#10B981]"><Icon name="check" className="h-4 w-4" /></span>{verified ? "Perfil verificado" : "Perfil sin verificar"}</p>
        <p className="flex items-center gap-2"><span className="text-[#64748B]"><Icon name="home" className="h-4 w-4" /></span>{hasPiso ? "1 habitacion libre" : "Buscando piso compartido"}</p>
      </div>

      <div className="mt-5 grid gap-2.5">
        {actionSlot}
        {secondaryActionSlot}
      </div>

      <div className="mt-4 border-t border-[#E9EEF4] pt-4">
        <ProfileSummaryCard
          profileName={profileName}
          age={age}
          city={city}
          zone={zone}
          role={role}
          language={language}
          photoUrl={photoUrl}
          verified={verified}
        />
        {hasPiso && mapAddress ? (
          <ExactPisoMapCard address={mapAddress} city={city} zone={zone} photoUrl={photoUrl} />
        ) : (
          <MiniMapCard area={`${zone}, ${city}`} />
        )}
        <QuickFacts items={quickFacts} />
      </div>

      <p className="mt-4 rounded-xl bg-[#F7FAFF] px-3 py-2 text-[12px] text-[#52637A]">
        Tip UX: responde en menos de 24h para mejorar la tasa de match y conversacion.
      </p>
    </aside>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await getCurrentUser();

  const { id } = await params;
  const query = await searchParams;
  const autoOpenRequestComposer =
    (Array.isArray(query.solicitar) ? query.solicitar[0] : query.solicitar) === "1";
  const supabase = await createSupabaseServerClient();

  const [{ data: meData }, { data: targetData }] = await Promise.all([
    authUser
      ? supabase
          .from("users")
          .select(
            "id,nombre,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones)",
          )
          .eq("id", authUser.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("users")
      .select(
        "id,tipo_usuario,nombre,edad,pais,ciudad,idiomas,fotoUrl,bio,verificado,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones),pisos(id,precio,zona,direccion,descripcion,disponibleDesde,gastosIncluidos,fotos,companeros_piso(nombre,fotoUrl,edad,estudiaOTrabaja,horario,fumar,mascotas,ambiente,descripcion))",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);

  const me = meData as (Pick<RawUser, "id" | "nombre" | "perfil_convivencia"> & { nombre: string }) | null;
  let target = targetData as RawUser | null;

  if (!target && id.startsWith("demo-")) {
    const demo = getDemoProfiles().find((item) => item.id === id) ?? null;

    if (demo) {
      target = {
        id: demo.id,
        tipo_usuario: demo.situacion.includes("tengo_piso") ? "propietario" : "buscador",
        nombre: demo.nombre,
        edad: demo.edad,
        pais: demo.pais,
        ciudad: demo.ciudad,
        idiomas: demo.idiomas,
        fotoUrl: demo.fotoUrl,
        bio: demo.bio,
        verificado: demo.verificado,
        perfil_convivencia: {
          situacion: demo.situacion,
          estudiaOTrabaja: demo.estudiaOTrabaja,
          universidad: demo.universidad,
          presupuesto: demo.presupuesto,
          zonas: [demo.zona],
          fumar: demo.fumar,
          mascotas: demo.mascotas,
          horario: demo.horario,
          ambiente: demo.ambiente,
          deporte: demo.deporte,
          aficiones: demo.aficiones,
        },
        pisos: demo.pisos,
      };
    }
  }

  if (!target && id.startsWith("demo-")) {
    const fallbackDemo = getDemoProfiles()[0] ?? null;
    if (fallbackDemo) {
      target = {
        id: fallbackDemo.id,
        tipo_usuario: fallbackDemo.situacion.includes("tengo_piso") ? "propietario" : "buscador",
        nombre: fallbackDemo.nombre,
        edad: fallbackDemo.edad,
        pais: fallbackDemo.pais,
        ciudad: fallbackDemo.ciudad,
        idiomas: fallbackDemo.idiomas,
        fotoUrl: fallbackDemo.fotoUrl,
        bio: fallbackDemo.bio,
        verificado: fallbackDemo.verificado,
        perfil_convivencia: {
          situacion: fallbackDemo.situacion,
          estudiaOTrabaja: fallbackDemo.estudiaOTrabaja,
          universidad: fallbackDemo.universidad,
          presupuesto: fallbackDemo.presupuesto,
          zonas: [fallbackDemo.zona],
          fumar: fallbackDemo.fumar,
          mascotas: fallbackDemo.mascotas,
          horario: fallbackDemo.horario,
          ambiente: fallbackDemo.ambiente,
          deporte: fallbackDemo.deporte,
          aficiones: fallbackDemo.aficiones,
        },
        pisos: fallbackDemo.pisos,
      };
    }
  }

  if (!target) {
    notFound();
  }

  const myProfile = me ? firstProfile(me.perfil_convivencia) : null;
  const targetProfile: RawProfile = firstProfile(target.perfil_convivencia) ?? {
    situacion: "busca_habitacion",
    estudiaOTrabaja: "Sin especificar",
    universidad: null,
    presupuesto: 0,
    zonas: [target.ciudad ?? ""],
    fumar: false,
    mascotas: false,
    horario: "flexible",
    ambiente: "equilibrado",
    deporte: "no_especificado",
    aficiones: [],
  };

  const score = myProfile ? compatibilityScore(myProfile, targetProfile) : 56;
  const rows = myProfile ? comparisonRows(myProfile, targetProfile) : [];
  const traits = chipFromProfile(targetProfile);
  const companionRows = companionsCompatibilityRows(myProfile, target.pisos?.[0]?.companeros_piso ?? []);
  const isOwner = target.tipo_usuario === "propietario" || normalize(targetProfile.situacion).includes("tengo_piso");
  const hasPiso = (target.pisos?.length ?? 0) > 0;
  const primaryPiso = target.pisos?.[0] ?? null;
  const companions = primaryPiso?.companeros_piso ?? [];
  const hasCompanions = companions.length > 0;
  const galleryImages =
    (target.pisos ?? []).flatMap((piso) => piso.fotos ?? []).filter((item) => item?.trim()) || [];
  const hasGallery = galleryImages.length > 0;
  const announcementPrice = hasPiso
    ? parseNumber(primaryPiso?.precio)
    : parseNumber(targetProfile.presupuesto);
  const listingTitle = hasPiso
    ? `Habitacion disponible en piso compartido en ${primaryPiso?.zona || target.ciudad}, ${target.ciudad}`
    : isOwner
      ? `Perfil de propietario en ${target.ciudad}`
      : `Busco habitacion en ${target.ciudad} con convivencia compatible`;
  const descriptionText = primaryPiso?.descripcion?.trim()
    ? cleanPisoDescription(primaryPiso.descripcion)
    : target.bio?.trim() || "Convivencia tranquila y piso bien conectado. Busco una persona responsable, con horarios claros y comunicacion sencilla para el dia a dia.";
  const pisoCompaneros = parseCompanerosFromDescription(primaryPiso?.descripcion);
  const norms = [
    "Respeto de descanso entre semana y cuidado de zonas comunes.",
    "Limpieza compartida con organizacion semanal simple.",
    targetProfile.fumar ? "Se permite fumar solo en zonas indicadas." : "No se fuma dentro de la vivienda.",
    targetProfile.mascotas ? "Mascotas permitidas con acuerdo previo." : "Sin mascotas por ahora.",
    "Ambiente de convivencia basado en comunicacion y respeto.",
  ];
  const quickFacts = [
    hasPiso ? "Piso compartido" : "Buscando piso",
    pisoCompaneros ? `${pisoCompaneros} companeros en casa` : hasPiso ? "Vive solo actualmente" : "Convivencia por definir",
    targetProfile.universidad ? targetProfile.universidad : "Universidad sin definir",
    primaryPiso?.gastosIncluidos ? "Gastos incluidos" : "Gastos no incluidos",
    `${primaryPiso?.zona || targetProfile.zonas?.[0] || target.ciudad}, ${target.ciudad}`,
    hasPiso ? `Disponible ${formatAvailability(primaryPiso?.disponibleDesde)}` : "Disponible por acordar",
  ];
  const dominantLanguage = (target.idiomas ?? [])[0] || "Espanol";

  return (
    <main className="min-h-screen bg-[#F3F5F8] pb-28 text-[#0F172A]">
      <Link
        href="/explore"
        aria-label="Volver"
        className="fixed left-1 top-12 z-30 inline-flex h-12 w-12 items-center justify-center text-[#334155] transition hover:text-[#0F172A] sm:left-2"
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-4 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-6 lg:pt-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.95fr)_minmax(300px,0.95fr)] lg:items-start">
          <section>
            <ProfileHeroPhoto
              imageUrl={withFallback(target.fotoUrl)}
              name={target.nombre}
              age={target.edad}
              city={target.ciudad}
              country={target.pais}
              role={targetProfile.estudiaOTrabaja}
            />
            {isOwner ? (
              hasGallery ? (
                <ListingHeaderGallery images={galleryImages} title={listingTitle} />
              ) : (
                <section className="rounded-3xl border border-[#E5EAF2] bg-[#EEF2F7] p-8 text-center shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                  <p className="text-[15px] font-semibold text-[#475467]">Este propietario no ha anadido fotos del piso todavia</p>
                </section>
              )
            ) : null}
            <HousingOrSearchSection
              hasPiso={hasPiso}
              price={announcementPrice}
              zone={primaryPiso?.zona || targetProfile.zonas?.[0] || target.ciudad}
              city={target.ciudad}
              availableFrom={primaryPiso?.disponibleDesde}
              companionsCount={companions.length || (pisoCompaneros ?? 0)}
              description={descriptionText}
              zones={targetProfile.zonas ?? []}
            />
            <ListingDescription title="Sobre mi" text={target.bio?.trim() || descriptionText} />
            <AdBanner adSlot="2345678901" className="mt-4 rounded-2xl" />
            <LivingStyleGrid profile={targetProfile} />
            {isOwner && hasCompanions ? <LivingWithSection companions={companions} /> : null}
            <CompatibilitySection score={score} rows={rows} companionCompatibilityRows={isOwner && hasCompanions ? companionRows : []} />

            <section className="mt-4 rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-6">
              <h2 className="text-[22px] font-semibold text-[#0F172A]">Perfil de convivencia</h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {traits.map((item) => (
                  <span key={item} className="rounded-full border border-[#DDE6F2] bg-[#F8FAFD] px-3 py-1.5 text-[13px] text-[#334155]">
                    {item}
                  </span>
                ))}
              </div>
              {(targetProfile.aficiones ?? []).length ? (
                <div className="mt-4 rounded-2xl border border-[#E6EAF0] bg-[#FAFBFD] p-4">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Aficiones</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {targetProfile.aficiones.map((aficion) => (
                      <span key={aficion} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-[#334155] border border-[#E5EAF2]">
                        {aficion}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {hasPiso ? (
              <MapSection
                area={`${primaryPiso?.zona || target.ciudad}, ${target.ciudad}`}
                address={primaryPiso?.direccion || `${primaryPiso?.zona || target.ciudad}, ${target.ciudad}`}
                city={target.ciudad}
                zone={primaryPiso?.zona || target.ciudad}
              />
            ) : null}
          </section>

          <section>
            <SidebarContactCard
              profileName={target.nombre}
              age={target.edad}
              city={target.ciudad}
              zone={primaryPiso?.zona || targetProfile.zonas?.[0] || target.ciudad}
              role={targetProfile.estudiaOTrabaja}
              language={dominantLanguage}
              photoUrl={withFallback(target.fotoUrl)}
              verified={target.verificado}
              isAvailableNow={Boolean(primaryPiso?.disponibleDesde) || hasPiso}
              price={announcementPrice}
              hasPiso={hasPiso}
              quickFacts={quickFacts}
              mapAddress={primaryPiso?.direccion ?? null}
              actionSlot={
                <RequestContactButton
                  profileId={target.id}
                  profileName={target.nombre}
                  profilePhotoUrl={target.fotoUrl}
                  compatibility={score}
                  isAuthenticated={authUser !== null}
                  disabled={authUser ? target.id === authUser.id : false}
                  autoOpen={autoOpenRequestComposer}
                  buttonLabel="Solicitar contacto"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F76565] px-4 text-[15px] font-semibold text-white transition hover:bg-[#ef5858]"
                />
              }
              secondaryActionSlot={
                <SaveProfileButton
                  item={{
                    id: target.id,
                    name: target.nombre,
                    age: target.edad,
                    city: target.ciudad,
                    zone: primaryPiso?.zona || targetProfile.zonas?.[0] || target.ciudad,
                    photoUrl: withFallback(target.fotoUrl),
                    hasPiso,
                    price: announcementPrice,
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-4 text-[15px] font-semibold text-[#1D2939] transition hover:bg-[#F3F4F6]"
                />
              }
            />
          </section>
        </div>
      </div>

    </main>
  );
}
