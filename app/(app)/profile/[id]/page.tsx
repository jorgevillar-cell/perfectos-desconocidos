import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileActions } from "@/components/profile/profile-actions";
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
  precio: number | string;
  zona: string;
  descripcion: string;
  disponibleDesde: string;
  gastosIncluidos: boolean;
  fotos: string[];
};

type RawUser = {
  id: string;
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
  if (value.includes("buscar_juntos")) return "Busca companero";
  return value.replaceAll("_", " ");
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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: meData }, { data: targetData }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id,nombre,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones)",
      )
      .eq("id", authUser.id)
      .maybeSingle(),
    supabase
      .from("users")
      .select(
        "id,nombre,edad,pais,ciudad,idiomas,fotoUrl,bio,verificado,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones),pisos(precio,zona,descripcion,disponibleDesde,gastosIncluidos,fotos)",
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

  if (!target) {
    notFound();
  }

  const myProfile = me ? firstProfile(me.perfil_convivencia) : null;
  const targetProfile = firstProfile(target.perfil_convivencia);

  if (!targetProfile) {
    notFound();
  }

  const score = myProfile ? compatibilityScore(myProfile, targetProfile) : 56;
  const rows = myProfile ? comparisonRows(myProfile, targetProfile) : [];
  const traits = chipFromProfile(targetProfile);
  const isStudent = normalize(targetProfile.estudiaOTrabaja).includes("estudiante");
  const hasPiso = normalize(targetProfile.situacion).includes("tengo_piso") || (target.pisos?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#F8F8F8] pb-28 text-[#1A1A1A]">
      <section className="relative h-80 w-full overflow-hidden">
        <img
          src={withFallback(target.fotoUrl)}
          alt={target.nombre}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/72 to-transparent" />

        <div className="absolute left-4 top-4">
          <Link
            href="/explore"
            className="inline-flex h-10 items-center rounded-[999px] bg-white/88 px-4 text-[14px] font-semibold text-[#1A1A1A]"
          >
            Volver
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-4 px-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-white">
              <h1 className="text-[24px] font-bold">
                {target.nombre}, {target.edad}
              </h1>
              <span className="text-[14px] font-normal leading-6">{target.pais}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {target.verificado ? (
                <span className="rounded-[999px] bg-[#22C55E] px-3 py-1 text-[14px] font-semibold text-white">Verificado</span>
              ) : null}
              {isStudent && targetProfile.universidad ? (
                <span className="rounded-[999px] bg-white/90 px-3 py-1 text-[14px] font-semibold text-[#1A1A1A]">
                  {targetProfile.universidad}
                </span>
              ) : null}
              {(target.idiomas ?? []).map((idioma) => (
                <span key={idioma} className="rounded-[999px] bg-white/90 px-3 py-1 text-[14px] font-normal text-[#1A1A1A]">
                  {idioma}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-6 max-w-4xl px-4 sm:px-6">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[24px] font-bold text-[#FF6B6B]">{score}%</p>
              <p className="text-[16px] font-semibold text-[#1A1A1A]">{compatibilityLabel(score)}</p>
            </div>
            <p className="text-[14px] font-normal leading-6 text-[#6B7280]">Comparativa perfil a perfil</p>
          </div>

          {rows.length ? (
            <div className="mt-4 space-y-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className={`rounded-xl border px-3 py-2 text-[14px] font-normal leading-6 ${comparisonBadgeClass(row.state)}`}
                >
                  <p className="font-semibold">{row.label}</p>
                  <p>{row.target} | {row.mine}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[14px] font-normal leading-6 text-[#6B7280]">No hay comparativa disponible aun.</p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Presentacion personal</h2>
          <p className="mt-2 text-[14px] font-normal leading-6 text-[#6B7280]">
            {target.bio?.trim() || "Sin presentacion todavia."}
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Rasgos de convivencia</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {traits.map((item) => (
              <span key={item} className="rounded-[999px] bg-[#F3F4F6] px-3 py-2 text-[14px] font-normal text-[#4B5563]">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Aficiones e intereses</h2>
          {(targetProfile.aficiones ?? []).length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {targetProfile.aficiones.map((aficion) => (
                <span key={aficion} className="rounded-[999px] bg-[#F3F4F6] px-3 py-2 text-[14px] font-normal text-[#4B5563]">
                  {aficion}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[14px] font-normal leading-6 text-[#6B7280]">Sin aficiones registradas.</p>
          )}
        </section>

        {hasPiso ? (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Piso disponible</h2>

            <div className="mt-3 overflow-x-auto">
              <div className="flex min-w-max gap-3">
                {(target.pisos ?? []).flatMap((piso) => piso.fotos ?? []).slice(0, 10).map((foto) => (
                  <img
                    key={foto}
                    src={foto}
                    alt="Foto del piso"
                    className="h-36 w-56 flex-none rounded-xl object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>

            {target.pisos?.[0] ? (
              <div className="mt-4 space-y-2 text-[14px] font-normal leading-6 text-[#6B7280]">
                <p className="text-[24px] font-bold text-[#FF6B6B]">{formatEuro(parseNumber(target.pisos[0].precio))}/mes</p>
                <p>Gastos incluidos: {boolText(target.pisos[0].gastosIncluidos)}</p>
                <p>Zona: {target.pisos[0].zona}</p>
                <p>Disponible desde: {target.pisos[0].disponibleDesde || "sin fecha"}</p>
                <p>{target.pisos[0].descripcion}</p>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Busqueda de piso</h2>
            <div className="mt-3 space-y-2 text-[14px] font-normal leading-6 text-[#6B7280]">
              <p className="text-[24px] font-bold text-[#FF6B6B]">{formatEuro(parseNumber(targetProfile.presupuesto))} max</p>
              <p>Zonas: {(targetProfile.zonas ?? []).join(", ") || target.ciudad}</p>
              <p>Tipo: {toSituacionLabel(targetProfile.situacion)}</p>
            </div>
          </section>
        )}
      </div>

      <ProfileActions
        profileId={target.id}
        disabled={target.id === authUser.id}
        profileName={target.nombre}
        profilePhotoUrl={target.fotoUrl}
        compatibility={score}
      />
    </main>
  );
}
