import type { SupabaseClient } from "@supabase/supabase-js";

import { computeCompatibility } from "@/lib/chat/compatibility";

export type RequestState = "solicitud_pendiente" | "solicitud_aceptada" | "solicitud_rechazada";
export type RequestDirection = "received" | "sent";

type ProfileRow = {
  universidad: string | null;
  presupuesto: number | string;
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
};

export type UserRequestRow = {
  id: string;
  nombre: string;
  edad: number;
  email: string;
  fotoUrl: string | null;
  perfil_convivencia: ProfileRow | ProfileRow[] | null;
};

export type MatchRequestRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  mensajePresentacion: string | null;
  estado: string;
  matchConfirmado: boolean;
  fechaSolicitud: string | null;
  creadoEn: string;
  tokenAceptar: string | null;
};

export type RequestSummary = {
  id: string;
  matchId: string;
  direction: RequestDirection;
  estado: RequestState;
  mensajePresentacion: string | null;
  fechaSolicitud: string;
  compatibility: number;
  otherUser: {
    id: string;
    nombre: string;
    edad: number;
    fotoUrl: string | null;
    email?: string;
  };
};

export type RequestsPayload = {
  received: RequestSummary[];
  sent: RequestSummary[];
  pendingReceivedCount: number;
};

export type RequestActionResult = {
  id: string;
  matchId: string;
  estado: RequestState;
  requester: UserRequestRow;
  recipient: UserRequestRow;
  compatibility: number;
};

type SupabaseLike = Pick<SupabaseClient, "from">;

type LegacyMatchRow = {
  id: string;
  usuarioAId: string;
  usuarioBId: string;
  matchConfirmado: boolean;
  creadoEn: string;
};

function isMissingColumnError(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    normalized.includes("does not exist") &&
    (normalized.includes("mensajepresentacion") ||
      normalized.includes("fechasolicitud") ||
      normalized.includes("tokenaceptar") ||
      normalized.includes("estado"))
  );
}

function toMatchRequestRow(match: LegacyMatchRow): MatchRequestRow {
  return {
    id: match.id,
    usuarioAId: match.usuarioAId,
    usuarioBId: match.usuarioBId,
    mensajePresentacion: null,
    estado: match.matchConfirmado ? "solicitud_aceptada" : "solicitud_pendiente",
    matchConfirmado: match.matchConfirmado,
    fechaSolicitud: null,
    creadoEn: match.creadoEn,
    tokenAceptar: null,
  };
}

function firstProfile(profile: UserRequestRow["perfil_convivencia"]) {
  if (!profile) return null;
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile;
}

function normalizeState(state: string | null | undefined, matchConfirmado: boolean): RequestState {
  if (matchConfirmado) return "solicitud_aceptada";
  if (state === "solicitud_rechazada") return "solicitud_rechazada";
  return "solicitud_pendiente";
}

export function getRequestTitle(state: RequestState) {
  if (state === "solicitud_aceptada") return "Aceptada";
  if (state === "solicitud_rechazada") return "Rechazada";
  return "Pendiente";
}

export function getRequestDate(value: string | null | undefined) {
  return value ?? new Date().toISOString();
}

export function buildRequestStateLabel(state: RequestState) {
  if (state === "solicitud_aceptada") return "Aceptada";
  if (state === "solicitud_rechazada") return "Rechazada";
  return "Pendiente";
}

export async function getUserRequestProfile(client: SupabaseLike, userId: string) {
  const { data, error } = await client
    .from("users")
    .select("id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserRequestRow;
}

export async function listContactRequests(client: SupabaseLike, currentUserId: string): Promise<RequestsPayload> {
  const { data: matchesData, error: matchesError } = await client
    .from("matches")
    .select("id,usuarioAId,usuarioBId,mensajePresentacion,estado,matchConfirmado,fechaSolicitud,creadoEn,tokenAceptar")
    .or(`usuarioAId.eq.${currentUserId},usuarioBId.eq.${currentUserId}`)
    .order("fechaSolicitud", { ascending: false })
    .order("creadoEn", { ascending: false });

  let matches: MatchRequestRow[] = (matchesData as MatchRequestRow[] | null) ?? [];

  if (matchesError) {
    if (!isMissingColumnError(matchesError.message)) {
      throw new Error(matchesError.message);
    }

    const { data: legacyMatchesData, error: legacyMatchesError } = await client
      .from("matches")
      .select("id,usuarioAId,usuarioBId,matchConfirmado,creadoEn")
      .or(`usuarioAId.eq.${currentUserId},usuarioBId.eq.${currentUserId}`)
      .order("creadoEn", { ascending: false });

    if (legacyMatchesError) {
      throw new Error(legacyMatchesError.message);
    }

    const legacyMatches = (legacyMatchesData as LegacyMatchRow[] | null) ?? [];
    matches = legacyMatches.map(toMatchRequestRow);
  }

  if (!matches.length) {
    return { received: [], sent: [], pendingReceivedCount: 0 };
  }

  const otherUserIds = new Set<string>();
  for (const match of matches) {
    otherUserIds.add(match.usuarioAId === currentUserId ? match.usuarioBId : match.usuarioAId);
  }

  const [{ data: currentUserData }, { data: usersData }] = await Promise.all([
    client
      .from("users")
      .select("id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
      .eq("id", currentUserId)
      .maybeSingle(),
    client
      .from("users")
      .select("id,nombre,edad,email,fotoUrl,perfil_convivencia(universidad,presupuesto,fumar,mascotas,horario,ambiente,deporte,aficiones)")
      .in("id", Array.from(otherUserIds)),
  ]);

  const currentUser = currentUserData as UserRequestRow | null;
  const currentProfile = firstProfile(currentUser?.perfil_convivencia ?? null);
  const users = (usersData as UserRequestRow[] | null) ?? [];
  const byId = new Map(users.map((item) => [item.id, item]));

  const received: RequestSummary[] = [];
  const sent: RequestSummary[] = [];

  for (const match of matches) {
    const direction: RequestDirection = match.usuarioBId === currentUserId ? "received" : "sent";
    const otherUserId = direction === "received" ? match.usuarioAId : match.usuarioBId;
    const otherUser = byId.get(otherUserId);

    if (!otherUser) {
      continue;
    }

    const compatibility = computeCompatibility(currentProfile, firstProfile(otherUser.perfil_convivencia));
    const normalizedState = normalizeState(match.estado, match.matchConfirmado);
    const requestSummary: RequestSummary = {
      id: match.id,
      matchId: match.id,
      direction,
      estado: normalizedState,
      mensajePresentacion: match.mensajePresentacion,
      fechaSolicitud: getRequestDate(match.fechaSolicitud ?? match.creadoEn),
      compatibility,
      otherUser: {
        id: otherUser.id,
        nombre: otherUser.nombre,
        edad: otherUser.edad,
        fotoUrl: otherUser.fotoUrl,
        email: otherUser.email,
      },
    };

    if (direction === "received") {
      received.push(requestSummary);
    } else {
      sent.push(requestSummary);
    }
  }

  received.sort((a, b) => Date.parse(b.fechaSolicitud) - Date.parse(a.fechaSolicitud));
  sent.sort((a, b) => Date.parse(b.fechaSolicitud) - Date.parse(a.fechaSolicitud));

  return {
    received,
    sent,
    pendingReceivedCount: received.filter((item) => item.estado === "solicitud_pendiente").length,
  };
}

export async function resolveContactRequestById(client: SupabaseLike, id: string, currentUserId: string) {
  const { data: match, error } = await client
    .from("matches")
    .select("id,usuarioAId,usuarioBId,mensajePresentacion,estado,matchConfirmado,fechaSolicitud,creadoEn,tokenAceptar")
    .eq("id", id)
    .maybeSingle<MatchRequestRow>();

  let resolvedMatch = match as MatchRequestRow | null;

  if (error) {
    if (!isMissingColumnError(error.message)) {
      return null;
    }

    const { data: legacyMatch, error: legacyError } = await client
      .from("matches")
      .select("id,usuarioAId,usuarioBId,matchConfirmado,creadoEn")
      .eq("id", id)
      .maybeSingle<LegacyMatchRow>();

    if (legacyError || !legacyMatch) {
      return null;
    }

    resolvedMatch = toMatchRequestRow(legacyMatch);
  }

  if (!resolvedMatch) {
    return null;
  }

  const requesterId = resolvedMatch.usuarioAId;
  const recipientId = resolvedMatch.usuarioBId;

  if (recipientId !== currentUserId) {
    return null;
  }

  const [requester, recipient] = await Promise.all([
    getUserRequestProfile(client, requesterId),
    getUserRequestProfile(client, recipientId),
  ]);

  if (!requester || !recipient) {
    return null;
  }

  const compatibility = computeCompatibility(firstProfile(requester.perfil_convivencia), firstProfile(recipient.perfil_convivencia));

  return {
    request: resolvedMatch,
    requester,
    recipient,
    compatibility,
    normalizedState: normalizeState(resolvedMatch.estado, resolvedMatch.matchConfirmado),
  };
}
