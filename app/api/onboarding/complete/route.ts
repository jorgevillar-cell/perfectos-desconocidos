import { NextResponse } from "next/server";

import { sendWelcomeEmail } from "@/lib/notifications/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type Payload = {
  nombre: string;
  edad: number;
  pais: string;
  ciudad: string;
  idiomas: string[];
  fotoPerfilDataUrl: string;
  estadoCivil: string;

  situacion: string;
  estudiaOTrabaja: string;
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuestoMax: number;
  zonas: string[];
  disponibleDesde: string;

  fumar: string;
  mascotas: string;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];

  bio: string;
  pisoPrecioAlquiler: number;
  pisoDireccion: string;
  pisoCompaneros: number;
  pisoGastosIncluidos: boolean;
  pisoFotosDataUrls: string[];
  pisoDescripcion: string;
  telefono: string;
  telefonoVerificado: boolean;
};

const BUCKET = "onboarding-media";

function dataUrlToBuffer(dataUrl: string) {
  const [meta, body] = dataUrl.split(",");
  const contentType = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  return {
    contentType,
    buffer: Buffer.from(body ?? "", "base64"),
  };
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((item) => item.name === BUCKET);

  if (exists) {
    return;
  }

  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
}

async function uploadDataUrl(path: string, dataUrl: string) {
  const { contentType, buffer } = dataUrlToBuffer(dataUrl);
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Error subiendo imagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function serializePisoDescription(description: string, companeros: number) {
  return `[PD_META_COMPANEROS:${companeros}]\n${description}`;
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Payload;

    await ensureBucket();

    const profilePhotoUrl = await uploadDataUrl(
      `profiles/${user.id}/avatar.jpg`,
      body.fotoPerfilDataUrl,
    );

    const pisoPhotoUrls: string[] = [];
    for (let i = 0; i < body.pisoFotosDataUrls.length; i += 1) {
      const uploaded = await uploadDataUrl(
        `pisos/${user.id}/piso-${i + 1}.jpg`,
        body.pisoFotosDataUrls[i],
      );
      pisoPhotoUrls.push(uploaded);
    }

    const usersPayload = {
      id: user.id,
      email: user.email,
      nombre: body.nombre,
      edad: body.edad,
      pais: body.pais,
      ciudad: body.ciudad,
      idiomas: body.idiomas,
      estadoCivil: body.estadoCivil || "prefiero_no_decir",
      fotoUrl: profilePhotoUrl,
      bio: body.bio,
      verificado: Boolean(body.telefonoVerificado),
      creadoEn: new Date().toISOString(),
    };

    const perfilPayload = {
      userId: user.id,
      situacion: body.situacion,
      estudiaOTrabaja: body.estudiaOTrabaja,
      carrera: body.carrera || null,
      universidad: body.universidad || null,
      trabajo: body.trabajo || null,
      presupuesto: body.presupuestoMax,
      zonas: body.zonas,
      fumar: body.fumar === "si_fumo",
      mascotas: body.mascotas !== "no_acepto",
      horario: body.horario,
      ambiente: body.ambiente,
      orden: "equilibrado",
      deporte: body.deporte || "no_especificado",
      aficiones: body.aficiones,
    };

    const { error: userError } = await supabase
      .from("users")
      .upsert(usersPayload, { onConflict: "id" });

    if (userError) {
      throw new Error(userError.message);
    }

    const { error: perfilError } = await supabase
      .from("perfil_convivencia")
      .upsert(perfilPayload, { onConflict: "userId" });

    if (perfilError) {
      throw new Error(perfilError.message);
    }

    if (body.situacion === "tengo_piso_libre") {
      await supabase.from("pisos").delete().eq("propietarioId", user.id);

      const pisoPayload = {
        propietarioId: user.id,
        precio: body.pisoPrecioAlquiler,
        zona: body.zonas[0] ?? body.ciudad,
        direccion: body.pisoDireccion || null,
        descripcion: serializePisoDescription(body.pisoDescripcion, body.pisoCompaneros),
        disponibleDesde: body.disponibleDesde || new Date().toISOString().slice(0, 10),
        fotos: pisoPhotoUrls,
        gastosIncluidos: Boolean(body.pisoGastosIncluidos),
      };

      const { error: pisoError } = await supabase.from("pisos").insert(pisoPayload);
      if (pisoError) {
        throw new Error(pisoError.message);
      }
    } else {
      await supabase.from("pisos").delete().eq("propietarioId", user.id);
    }

    if (user.email) {
      try {
        await sendWelcomeEmail({
          to: [user.email],
          name: body.nombre,
        });
      } catch (emailError) {
        console.error("[onboarding:welcome-email:error]", {
          userId: user.id,
          email: user.email,
          error:
            emailError instanceof Error
              ? {
                  name: emailError.name,
                  message: emailError.message,
                  stack: emailError.stack,
                }
              : String(emailError),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 },
    );
  }
}