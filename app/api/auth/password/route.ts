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

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword?.trim() ?? "";
  const newPassword = body.newPassword?.trim() ?? "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Introduce tu contraseña actual" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  // Verify current password by trying to sign in
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }

  // Update password via admin
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
