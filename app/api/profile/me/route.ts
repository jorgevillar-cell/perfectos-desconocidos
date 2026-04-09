import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "onboarding-media";

function dataUrlToBuffer(dataUrl: string) {
  const [meta, body] = dataUrl.split(",");
  const contentType = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  return {
    contentType,
    buffer: Buffer.from(body ?? "", "base64"),
  };
}

async function uploadDataUrl(path: string, dataUrl: string) {
  const { contentType, buffer } = dataUrlToBuffer(dataUrl);
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  const url = new URL(request.url);
  const full = url.searchParams.get("full") === "true";

  if (!full) {
    const { data: userRow } = await supabase
      .from("users")
      .select("id,nombre,email")
      .eq("id", user.id)
      .maybeSingle<{ id: string; nombre: string | null; email: string | null }>();

    const fallbackName = user.email?.split("@")[0] ?? "Usuario";

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: userRow?.nombre?.trim() || fallbackName,
        email: user.email ?? userRow?.email ?? "",
      },
    });
  }

  const [{ data: userRow }, { data: perfil }, { data: piso }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("perfil_convivencia").select("*").eq("userId", user.id).maybeSingle(),
    supabase.from("pisos").select("*").eq("propietarioId", user.id).maybeSingle(),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: userRow,
    perfil,
    piso,
  });
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      nombre?: string;
      edad?: number;
      pais?: string;
      ciudad?: string;
      idiomas?: string[];
      estadoCivil?: string;
      bio?: string;
      fotoPerfilDataUrl?: string;
      situacion?: string;
      estudiaOTrabaja?: string;
      carrera?: string;
      universidad?: string;
      trabajo?: string;
      presupuesto?: number;
      zonas?: string[];
      fumar?: string;
      mascotas?: string;
      horario?: string;
      ambiente?: string;
      deporte?: string;
      aficiones?: string[];
      pisoPrecio?: number;
      pisoCalle?: string;
      pisoDescripcion?: string;
      pisoGastosIncluidos?: boolean;
      pisoDisponibleDesde?: string;
    };

    // Upload new avatar if provided
    let fotoUrl: string | undefined;
    if (body.fotoPerfilDataUrl?.startsWith("data:")) {
      fotoUrl = await uploadDataUrl(`profiles/${user.id}/avatar.jpg`, body.fotoPerfilDataUrl);
    }

    // Update users table
    const userUpdate: Record<string, unknown> = {};
    if (body.nombre !== undefined) userUpdate.nombre = body.nombre;
    if (body.edad !== undefined) userUpdate.edad = body.edad;
    if (body.pais !== undefined) userUpdate.pais = body.pais;
    if (body.ciudad !== undefined) userUpdate.ciudad = body.ciudad;
    if (body.idiomas !== undefined) userUpdate.idiomas = body.idiomas;
    if (body.estadoCivil !== undefined) userUpdate.estadoCivil = body.estadoCivil;
    if (body.bio !== undefined) userUpdate.bio = body.bio;
    if (fotoUrl) userUpdate.fotoUrl = fotoUrl;

    if (Object.keys(userUpdate).length > 0) {
      const { error: userError } = await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", user.id);

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }
    }

    // Update perfil_convivencia
    const perfilUpdate: Record<string, unknown> = { userId: user.id };
    if (body.situacion !== undefined) perfilUpdate.situacion = body.situacion;
    if (body.estudiaOTrabaja !== undefined) perfilUpdate.estudiaOTrabaja = body.estudiaOTrabaja;
    if (body.carrera !== undefined) perfilUpdate.carrera = body.carrera || null;
    if (body.universidad !== undefined) perfilUpdate.universidad = body.universidad || null;
    if (body.trabajo !== undefined) perfilUpdate.trabajo = body.trabajo || null;
    if (body.presupuesto !== undefined) perfilUpdate.presupuesto = body.presupuesto;
    if (body.zonas !== undefined) perfilUpdate.zonas = body.zonas;
    if (body.fumar !== undefined) perfilUpdate.fumar = body.fumar === "si_fumo";
    if (body.mascotas !== undefined) perfilUpdate.mascotas = body.mascotas !== "no_acepto";
    if (body.horario !== undefined) perfilUpdate.horario = body.horario;
    if (body.ambiente !== undefined) perfilUpdate.ambiente = body.ambiente;
    if (body.deporte !== undefined) perfilUpdate.deporte = body.deporte || "no_especificado";
    if (body.aficiones !== undefined) perfilUpdate.aficiones = body.aficiones;
    perfilUpdate.orden = "equilibrado";

    if (Object.keys(perfilUpdate).length > 1) {
      const { error: perfilError } = await supabase
        .from("perfil_convivencia")
        .upsert(perfilUpdate, { onConflict: "userId" });

      if (perfilError) {
        return NextResponse.json({ error: perfilError.message }, { status: 500 });
      }
    }

    // Update piso for propietarios
    if (body.situacion === "tengo_piso_libre" && body.pisoPrecio) {
      const pisoUpdate = {
        precio: body.pisoPrecio,
        zona: body.zonas?.[0] ?? body.ciudad ?? "",
        direccion: body.pisoCalle || null,
        descripcion: body.pisoDescripcion || "",
        disponibleDesde: body.pisoDisponibleDesde || new Date().toISOString().slice(0, 10),
        gastosIncluidos: Boolean(body.pisoGastosIncluidos),
      };

      const { data: existingPiso } = await supabase
        .from("pisos")
        .select("id")
        .eq("propietarioId", user.id)
        .maybeSingle();

      if (existingPiso) {
        await supabase.from("pisos").update(pisoUpdate).eq("id", existingPiso.id);
      } else {
        await supabase
          .from("pisos")
          .insert({ propietarioId: user.id, fotos: [], ...pisoUpdate });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 },
    );
  }
}
