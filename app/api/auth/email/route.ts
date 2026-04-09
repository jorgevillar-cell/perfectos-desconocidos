import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as { email?: string; currentPassword?: string };
  const newEmail = body.email?.trim().toLowerCase() ?? "";
  const currentPassword = body.currentPassword?.trim() ?? "";

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Introduce un email válido" }, { status: 400 });
  }

  if (newEmail === user.email) {
    return NextResponse.json({ error: "El email es el mismo que el actual" }, { status: 400 });
  }

  if (!currentPassword) {
    return NextResponse.json({ error: "Introduce tu contraseña para confirmar el cambio" }, { status: 400 });
  }

  // Verify current password
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: "La contraseña no es correcta" }, { status: 400 });
  }

  // Update email in Supabase auth
  const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
    email: newEmail,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Update email in users table
  await supabase.from("users").update({ email: newEmail }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
