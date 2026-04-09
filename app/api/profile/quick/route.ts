import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type QuickProfilePayload = {
  nombre: string;
  edad: number;
  pais: string;
  ciudad: string;
  idiomas: string[];
  estadoCivil: string;
  bio: string;
  situacion: string;
  estudiaOTrabaja: string;
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuestoMax: number;
  zonas: string[];
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  hasPiso: boolean;
  pisoPrecio: number;
  pisoZona: string;
  pisoDireccion: string;
  pisoDescripcion: string;
  pisoGastosIncluidos: boolean;
  pisoDisponibleDesde: string;
};

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select(
      "id,nombre,edad,pais,ciudad,idiomas,estadoCivil,bio,tipo_usuario,perfil_convivencia(situacion,estudiaOTrabaja,carrera,universidad,trabajo,presupuesto,zonas,fumar,mascotas,horario,ambiente,deporte,aficiones),pisos(id,precio,zona,direccion,descripcion,gastosIncluidos,disponibleDesde)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo cargar el perfil" }, { status: 500 });
  }

  const profile = Array.isArray(data.perfil_convivencia) ? data.perfil_convivencia[0] : data.perfil_convivencia;
  const piso = (data.pisos ?? [])[0] ?? null;

  return NextResponse.json({
    profile: {
      nombre: data.nombre ?? "",
      edad: Number(data.edad ?? 18),
      pais: data.pais ?? "",
      ciudad: data.ciudad ?? "",
      idiomas: normalizeArray(data.idiomas),
      estadoCivil: data.estadoCivil ?? "prefiero_no_decir",
      bio: data.bio ?? "",
      situacion: profile?.situacion ?? "",
      estudiaOTrabaja: profile?.estudiaOTrabaja ?? "",
      carrera: profile?.carrera ?? "",
      universidad: profile?.universidad ?? "",
      trabajo: profile?.trabajo ?? "",
      presupuestoMax: Number(profile?.presupuesto ?? 900),
      zonas: normalizeArray(profile?.zonas),
      fumar: Boolean(profile?.fumar),
      mascotas: Boolean(profile?.mascotas),
      horario: profile?.horario ?? "normal",
      ambiente: profile?.ambiente ?? "equilibrado",
      deporte: profile?.deporte ?? "poco",
      aficiones: normalizeArray(profile?.aficiones),
      hasPiso: Boolean(piso),
      pisoPrecio: Number(piso?.precio ?? 0),
      pisoZona: piso?.zona ?? "",
      pisoDireccion: piso?.direccion ?? "",
      pisoDescripcion: piso?.descripcion ?? "",
      pisoGastosIncluidos: Boolean(piso?.gastosIncluidos),
      pisoDisponibleDesde: typeof piso?.disponibleDesde === "string" ? piso.disponibleDesde.slice(0, 10) : "",
    },
  });
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<QuickProfilePayload>;

  const usersPayload = {
    id: user.id,
    nombre: (body.nombre ?? "").trim(),
    edad: Number(body.edad ?? 18),
    pais: (body.pais ?? "").trim(),
    ciudad: (body.ciudad ?? "").trim(),
    idiomas: normalizeArray(body.idiomas),
    estadoCivil: (body.estadoCivil ?? "prefiero_no_decir").trim() || "prefiero_no_decir",
    bio: (body.bio ?? "").trim() || null,
  };

  const perfilPayload = {
    userId: user.id,
    situacion: (body.situacion ?? "").trim() || "busco_habitacion",
    estudiaOTrabaja: (body.estudiaOTrabaja ?? "").trim() || "estudiante",
    carrera: (body.carrera ?? "").trim() || null,
    universidad: (body.universidad ?? "").trim() || null,
    trabajo: (body.trabajo ?? "").trim() || null,
    presupuesto: Math.max(200, Number(body.presupuestoMax ?? 900)),
    zonas: normalizeArray(body.zonas),
    fumar: Boolean(body.fumar),
    mascotas: Boolean(body.mascotas),
    horario: (body.horario ?? "normal").trim() || "normal",
    ambiente: (body.ambiente ?? "equilibrado").trim() || "equilibrado",
    orden: "equilibrado",
    deporte: (body.deporte ?? "poco").trim() || "poco",
    aficiones: normalizeArray(body.aficiones),
  };

  const { error: userError } = await supabase.from("users").upsert(usersPayload, { onConflict: "id" });
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("perfil_convivencia").upsert(perfilPayload, { onConflict: "userId" });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const wantsPiso = Boolean(body.hasPiso);

  if (wantsPiso) {
    const { data: existingPisos } = await supabase.from("pisos").select("id").eq("propietarioId", user.id).limit(1);
    const currentPisoId = existingPisos?.[0]?.id ?? null;

    const pisoPayload = {
      propietarioId: user.id,
      precio: Math.max(0, Number(body.pisoPrecio ?? 0)),
      zona: (body.pisoZona ?? body.ciudad ?? "").trim() || "Centro",
      direccion: (body.pisoDireccion ?? "").trim() || null,
      descripcion: (body.pisoDescripcion ?? "").trim() || "Piso compartido.",
      disponibleDesde: (body.pisoDisponibleDesde ?? "").trim() || new Date().toISOString().slice(0, 10),
      gastosIncluidos: Boolean(body.pisoGastosIncluidos),
    };

    if (currentPisoId) {
      const { error: pisoUpdateError } = await supabase.from("pisos").update(pisoPayload).eq("id", currentPisoId);
      if (pisoUpdateError) {
        return NextResponse.json({ error: pisoUpdateError.message }, { status: 500 });
      }
    } else {
      const { error: pisoInsertError } = await supabase.from("pisos").insert({ ...pisoPayload, fotos: [] });
      if (pisoInsertError) {
        return NextResponse.json({ error: pisoInsertError.message }, { status: 500 });
      }
    }
  } else {
    await supabase.from("pisos").delete().eq("propietarioId", user.id);
  }

  return NextResponse.json({ ok: true });
}
