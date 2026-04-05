import { NextResponse } from "next/server";

import { createPaymentRequestMessage, getMatch, getPrimaryPisoForUser, getUser, triggerPaymentUpdate } from "@/lib/payments/service";
import { formatMoney } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

type Payload = {
  matchId?: string;
  amount?: number;
  pisoId?: string;
};

type ProfileShape = {
  situacion: string;
};

function firstProfile(profile: unknown): ProfileShape | null {
  if (Array.isArray(profile)) {
    return (profile[0] as ProfileShape | undefined) ?? null;
  }

  return (profile as ProfileShape | null) ?? null;
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Payload;
  const matchId = body.matchId?.trim() ?? "";
  const pisoId = body.pisoId?.trim() ?? "";
  const amount = Number(body.amount ?? 0);

  if (!matchId) {
    return NextResponse.json({ error: "Falta matchId" }, { status: 400 });
  }

  const match = await getMatch(matchId);
  if (!match || !match.matchConfirmado) {
    return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
  }

  const isMember = match.usuarioAId === user.id || match.usuarioBId === user.id;
  if (!isMember) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const me = await getUser(user.id);
  const myProfile = me?.perfil_convivencia ? firstProfile(me.perfil_convivencia) : null;
  if (!me || !myProfile || !myProfile.situacion.toLowerCase().includes("tengo_piso_libre")) {
    return NextResponse.json({ error: "Solo el propietario puede crear solicitudes de pago" }, { status: 403 });
  }

  const pisoFromId = pisoId
    ? await supabase
        .from("pisos")
        .select("id,propietarioId,precio,zona,direccion,descripcion,fotos")
        .eq("id", pisoId)
        .maybeSingle<{
          id: string;
          propietarioId: string;
          precio: number | string;
          zona: string;
          direccion: string | null;
          descripcion: string;
          fotos: string[];
        }>()
    : null;

  const piso = (pisoFromId ? pisoFromId.data : await getPrimaryPisoForUser(user.id)) as {
    id: string;
    propietarioId: string;
    precio: number | string;
    zona: string;
    direccion: string | null;
    descripcion: string;
    fotos: string[];
  } | null;

  if (!piso || piso.propietarioId !== user.id) {
    return NextResponse.json({ error: "El piso no pertenece a este usuario" }, { status: 403 });
  }

  const effectiveAmount = amount > 0 ? amount : Number(piso.precio);
  if (!(effectiveAmount > 0)) {
    return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
  }

  const existing = await supabase
    .from("pagos")
    .select("id,estado")
    .eq("matchId", matchId)
    .order("creadoEn", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; estado: string }>();

  if (existing.data && ["pendiente", "autorizado", "pagado", "incidencia_abierta"].includes(existing.data.estado)) {
    return NextResponse.json({ error: "Ya existe un pago en curso para este match" }, { status: 409 });
  }

  const inquilinoId = match.usuarioAId === user.id ? match.usuarioBId : match.usuarioAId;

  const { data: inserted, error: insertError } = await supabase
    .from("pagos")
    .insert({
      matchId,
      pisoId: piso.id,
      inquilinoId,
      propietarioId: user.id,
      cantidad: effectiveAmount,
      estado: "pendiente",
    })
    .select("id,matchId,pisoId,inquilinoId,propietarioId,cantidad,estado,stripePaymentIntentId,liberadoEn,creadoEn")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo crear el pago" }, { status: 500 });
  }

  await createPaymentRequestMessage({
    matchId,
    senderId: user.id,
    paymentId: inserted.id,
    amount: effectiveAmount,
  });

  await triggerPaymentUpdate(
    {
      id: inserted.id,
      matchId: inserted.matchId,
      pisoId: inserted.pisoId,
      cantidad: Number(inserted.cantidad),
      estado: "pendiente",
      stripePaymentIntentId: inserted.stripePaymentIntentId,
      liberadoEn: inserted.liberadoEn,
      creadoEn: inserted.creadoEn,
    },
    matchId,
  );

  return NextResponse.json({
    ok: true,
    paymentId: inserted.id,
    amount: effectiveAmount,
    amountLabel: formatMoney(effectiveAmount),
  });
}