import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExploreScreen } from "@/components/explore/explore-screen";
import type { ExploreProfile } from "@/components/explore/explore-screen";
import { getDemoProfiles } from "@/lib/explore/demo-profiles";
import type { MatchCelebrationPayload } from "@/lib/chat/types";

type DbUser = {
  id: string;
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
      }>
    | null;
};

type BaseProfile = {
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
  fotoUrl: string;
};

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

  return {
    id: user.id,
    nombre: user.nombre,
    edad: user.edad,
    ciudad: user.ciudad,
    zona: profile.zonas?.[0] ?? user.ciudad,
    universidad: profile.universidad,
    situacion: profile.situacion,
    estudiaOTrabaja: profile.estudiaOTrabaja,
    fumar: profile.fumar,
    mascotas: profile.mascotas,
    horario: profile.horario,
    ambiente: profile.ambiente,
    deporte: profile.deporte,
    aficiones: profile.aficiones ?? [],
    presupuesto: asNumber(profile.presupuesto),
    tienePiso: (user.pisos?.length ?? 0) > 0 || normalize(profile.situacion).includes("tengo_piso"),
    precioPiso: primaryPiso ? asNumber(primaryPiso.precio) : null,
    fotoUrl: user.fotoUrl ?? "",
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
      nombre: profile.nombre,
      edad: profile.edad,
      ciudad: profile.ciudad,
      zona: profile.zona,
      universidad: profile.universidad,
      situacion: profile.situacion,
      estudiaOTrabaja: profile.estudiaOTrabaja,
      fumar: profile.fumar,
      mascotas: profile.mascotas,
      horario: profile.horario,
      ambiente: profile.ambiente,
      deporte: profile.deporte,
      aficiones: profile.aficiones,
      presupuesto: profile.presupuesto,
      tienePiso: profile.tienePiso,
      precioPiso: profile.precioPiso,
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

  if (!authUser) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();

  const { data: dbUsers } = await supabase
    .from("users")
    .select(
      "id,nombre,edad,ciudad,fotoUrl,perfil_convivencia(situacion,estudiaOTrabaja,universidad,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones),pisos(id,precio,zona,direccion,descripcion,fotos)",
    )
    .limit(120);

  const users = (dbUsers as DbUser[] | null) ?? [];
  const myDbUser = users.find((candidate) => candidate.id === authUser.id) ?? null;
  const myProfile = myDbUser ? fromDbToBase(myDbUser) : null;

  const initialCity = myDbUser?.ciudad ?? "Madrid";

  const realProfiles = users
    .filter((candidate) => candidate.id !== authUser.id)
    .map(fromDbToBase)
    .filter((candidate): candidate is BaseProfile => candidate !== null)
    .map((candidate) => toExploreProfile(candidate, compatibilidad(myProfile, candidate)))
    .sort((a, b) => b.compatibilidad - a.compatibilidad);

  const hasRealProfiles = realProfiles.length > 0;
  const initialProfiles = hasRealProfiles ? realProfiles : fallbackProfiles(initialCity);
  const initialCityForExplore = hasRealProfiles ? initialCity : "";
  const currentUserPrimaryPiso = myDbUser?.pisos?.[0]
    ? {
        id: myDbUser.pisos[0].id,
        precio: asNumber(myDbUser.pisos[0].precio),
        zona: myDbUser.pisos[0].zona,
        direccion: myDbUser.pisos[0].direccion,
        descripcion: myDbUser.pisos[0].descripcion,
        fotos: myDbUser.pisos[0].fotos ?? [],
      }
    : null;

  const query = await searchParams;
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
      currentUserId={authUser.id}
      currentUserName={myDbUser?.nombre ?? authUser.email ?? "Usuario"}
      currentUserHasPiso={Boolean(currentUserPrimaryPiso)}
      currentUserPrimaryPiso={currentUserPrimaryPiso}
      initialCity={initialCityForExplore}
      initialProfiles={initialProfiles}
      openChatWithUserId={openChatWithUserId}
      initialCelebration={celebrationPayload}
    />
  );
}