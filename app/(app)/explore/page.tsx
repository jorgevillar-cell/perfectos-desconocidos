import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExploreScreenEntry as ExploreScreen } from "@/components/explore/explore-screen-entry";
import type { ExploreProfile } from "@/components/explore/explore-screen";
import { getDemoProfiles } from "@/lib/explore/demo-profiles";
import type { MatchCelebrationPayload } from "@/lib/chat/types";

type DbUser = {
  id: string;
  tipo_usuario: string | null;
  verificado: boolean | null;
  nombre: string;
  edad: number;
  ciudad: string;
  fotoUrl: string | null;
  perfil_convivencia:
    | {
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
      }
    | Array<{
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
      }>
    | null;
  pisos:
    | Array<{
        id: string;
        precio: number | string;
        zona: string;
        direccion: string | null;
        descripcion: string;
        fotos: string[];
        companeros_piso:
          | Array<{
              nombre: string;
              fotoUrl: string | null;
            }>
          | null;
      }>
    | null;
};

type BaseProfile = {
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
  fotoUrl: string;
};

function parseCompanerosFromDescription(description: string | null | undefined) {
  const value = description ?? "";
  const match = value.match(/\[PD_META_COMPANEROS:(\d+)\]/i);
  if (!match) return null;
  return Number(match[1] ?? "0") || null;
}

function stripMetaFromDescription(description: string | null | undefined) {
  return (description ?? "").replace(/^\[PD_META_COMPANEROS:\d+\]\s*/i, "").trim();
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function asProfile(profile: DbUser["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }
  return profile;
}

function cityFromAddress(address: string | null | undefined) {
  const value = (address ?? "").trim();
  if (!value) return null;

  const parts = value.split(",").map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function buildTags(profile: BaseProfile): [string, string, string] {
  const fumarTag = profile.fumar ? "Fuma" : "No fuma";
  const mascotasTag = profile.mascotas ? "Mascotas" : "Sin mascotas";
  const horarioTag = normalize(profile.horario).includes("noct")
    ? "Nocturno"
    : normalize(profile.horario).includes("madr")
      ? "Madrugador"
      : "Horario normal";

  return [fumarTag, mascotasTag, horarioTag];
}

function compatibilidad(
  me: BaseProfile | null,
  candidate: BaseProfile,
): number {
  if (!me) {
    return 56;
  }

  let total = 0;

  if (me.fumar === candidate.fumar) total += 20;
  if (normalize(me.horario) === normalize(candidate.horario)) total += 20;
  if (normalize(me.ambiente) === normalize(candidate.ambiente)) total += 15;
  if (me.mascotas === candidate.mascotas) total += 15;

  const sameUniversity =
    !!me.universidad &&
    !!candidate.universidad &&
    normalize(me.universidad) === normalize(candidate.universidad);
  if (sameUniversity) total += 15;

  const maxBudget = Math.max(me.presupuesto, candidate.presupuesto, 1);
  const diffRatio = Math.abs(me.presupuesto - candidate.presupuesto) / maxBudget;
  if (diffRatio <= 0.2) total += 10;

  const sharedHobby = candidate.aficiones.some((hobby) =>
    me.aficiones.map((item) => normalize(item)).includes(normalize(hobby)),
  );
  const sameSport = normalize(me.deporte) === normalize(candidate.deporte);
  if (sharedHobby || sameSport) total += 5;

  return Math.max(0, Math.min(100, Math.round(total)));
}

function fromDbToBase(user: DbUser): BaseProfile | null {
  const profile = asProfile(user.perfil_convivencia);
  if (!profile) return null;

  const primaryPiso = user.pisos?.[0] ?? null;
  const hasPublishedPiso = (user.pisos?.length ?? 0) > 0;
  const derivedPisoCity = cityFromAddress(primaryPiso?.direccion);
  const usesPisoCity = user.tipo_usuario === "propietario" || normalize(profile.situacion).includes("tengo_piso");
  const effectiveCity = usesPisoCity && derivedPisoCity ? derivedPisoCity : user.ciudad;

  const rawHobbies = profile.aficiones ?? [];
  const esErasmus = rawHobbies.some((item) => normalize(item) === "erasmus");
  const visibleHobbies = rawHobbies.filter((item) => normalize(item) !== "erasmus");

  return {
    id: user.id,
    verificado: Boolean(user.verificado),
    nombre: user.nombre,
    edad: user.edad,
    ciudad: effectiveCity,
    zona: primaryPiso?.zona ?? profile.zonas?.[0] ?? effectiveCity,
    universidad: profile.universidad,
    situacion: profile.situacion,
    estudiaOTrabaja: profile.estudiaOTrabaja,
    esErasmus,
    fumar: profile.fumar,
    mascotas: profile.mascotas,
    horario: profile.horario,
    ambiente: profile.ambiente,
    deporte: profile.deporte,
    aficiones: visibleHobbies,
    presupuesto: asNumber(profile.presupuesto),
    tienePiso: hasPublishedPiso,
    precioPiso: primaryPiso ? asNumber(primaryPiso.precio) : null,
    pisoDireccion: primaryPiso?.direccion ?? null,
    pisoCompaneros: parseCompanerosFromDescription(primaryPiso?.descripcion),
    pisoFotos: primaryPiso?.fotos ?? [],
    userType:
      user.tipo_usuario === "propietario" || normalize(profile.situacion).includes("tengo_piso")
        ? "propietario"
        : "buscador",
    companionCount: (primaryPiso?.companeros_piso ?? []).length || parseCompanerosFromDescription(primaryPiso?.descripcion) || 0,
    companionNames: (primaryPiso?.companeros_piso ?? []).map((item) => item.nombre).filter(Boolean),
    companionPhotos: (primaryPiso?.companeros_piso ?? []).map((item) => item.fotoUrl ?? "").filter(Boolean),
    fotoUrl: (primaryPiso?.fotos?.[0] ?? user.fotoUrl) ?? "",
  };
}

function toExploreProfile(
  base: BaseProfile,
  score: number,
): ExploreProfile {
  return {
    ...base,
    compatibilidad: score,
    badgeTags: buildTags(base),
  };
}

function fallbackProfiles(city: string): ExploreProfile[] {
  void city;

  return getDemoProfiles().map((profile) => {
    const base: BaseProfile = {
      id: profile.id,
      verificado: profile.verificado,
      nombre: profile.nombre,
      edad: profile.edad,
      ciudad: profile.ciudad,
      zona: profile.zona,
      universidad: profile.universidad,
      situacion: profile.situacion,
      estudiaOTrabaja: profile.estudiaOTrabaja,
      esErasmus: profile.esErasmus,
      fumar: profile.fumar,
      mascotas: profile.mascotas,
      horario: profile.horario,
      ambiente: profile.ambiente,
      deporte: profile.deporte,
      aficiones: profile.aficiones,
      presupuesto: profile.presupuesto,
      tienePiso: profile.tienePiso,
      precioPiso: profile.precioPiso,
      pisoDireccion: profile.pisos[0]?.direccion ?? null,
      pisoCompaneros: parseCompanerosFromDescription(profile.pisos[0]?.descripcion ?? null),
      pisoFotos: profile.pisos[0]?.fotos ?? [],
      userType: profile.situacion.includes("tengo_piso") ? "propietario" : "buscador",
      companionCount: parseCompanerosFromDescription(profile.pisos[0]?.descripcion ?? null) || 0,
      companionNames: [],
      companionPhotos: [],
      fotoUrl: profile.fotoUrl,
    };

    return toExploreProfile(base, profile.compatibilidad);
  });
}

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await getCurrentUser();

  const query = await searchParams;
  const initialCityFromQuery = firstQueryValue(query.ciudad);

  const supabase = await createSupabaseServerClient();

  const { data: dbUsers } = await supabase
    .from("users")
    .select(
      "id,tipo_usuario,verificado,nombre,edad,ciudad,fotoUrl,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones),pisos(id,precio,zona,direccion,descripcion,fotos,companeros_piso(nombre,fotoUrl))",
    )
    .limit(120);

  const users = (dbUsers as DbUser[] | null) ?? [];
  const myDbUser = authUser ? users.find((candidate) => candidate.id === authUser.id) ?? null : null;
  const myProfile = myDbUser ? fromDbToBase(myDbUser) : null;

  const initialCity = initialCityFromQuery || myDbUser?.ciudad || "Madrid";

  const realProfiles = users
    .filter((candidate) => (authUser ? candidate.id !== authUser.id : true))
    .map(fromDbToBase)
    .filter((candidate): candidate is BaseProfile => candidate !== null)
    .map((candidate) => toExploreProfile(candidate, compatibilidad(myProfile, candidate)))
    .sort((a, b) => b.compatibilidad - a.compatibilidad);

  const hasRealProfiles = realProfiles.length > 0;
  const initialProfiles = hasRealProfiles ? realProfiles : fallbackProfiles(initialCity);
  const initialCityForExplore = initialCity;

  const openChatWithUserId = firstQueryValue(query.chatWith) || null;
  const celebrate = firstQueryValue(query.celebrate) === "1";

  const celebrationPayload: MatchCelebrationPayload | null = celebrate
    ? {
        matchId: firstQueryValue(query.matchId),
        otherUserId: firstQueryValue(query.chatWith),
        otherUserName: firstQueryValue(query.matchName) || "Nuevo match",
        otherUserPhoto: firstQueryValue(query.matchPhoto) || null,
        compatibility: Number(firstQueryValue(query.compatibility) || "56"),
      }
    : null;

  return (
    <ExploreScreen
      isAuthenticated={Boolean(authUser)}
      currentUserId={authUser?.id ?? "guest"}
      currentUserName={myDbUser?.nombre ?? authUser?.email ?? "Invitado"}
      initialCity={initialCityForExplore}
      initialProfiles={initialProfiles}
      openChatWithUserId={authUser ? openChatWithUserId : null}
      initialCelebration={authUser ? celebrationPayload : null}
    />
  );
}