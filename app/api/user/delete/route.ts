import { NextResponse, type NextRequest } from "next/server";

import { supabase } from "@/lib/supabase";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const authClient = await createSupabaseActionClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = user.id;

  const deleteMessages = await supabase.from("mensajes").delete().eq("remitenteId", userId);
  if (deleteMessages.error) {
    return NextResponse.json({ error: deleteMessages.error.message }, { status: 500 });
  }

  const deleteMatches = await supabase
    .from("matches")
    .delete()
    .or(`usuarioAId.eq.${userId},usuarioBId.eq.${userId}`);

  if (deleteMatches.error) {
    return NextResponse.json({ error: deleteMatches.error.message }, { status: 500 });
  }

  const deleteProfile = await supabase.from("perfil_convivencia").delete().eq("userId", userId);
  if (deleteProfile.error) {
    return NextResponse.json({ error: deleteProfile.error.message }, { status: 500 });
  }

  const deletePisos = await supabase.from("pisos").delete().eq("propietarioId", userId);
  if (deletePisos.error) {
    return NextResponse.json({ error: deletePisos.error.message }, { status: 500 });
  }

  const deleteUserRow = await supabase.from("users").delete().eq("id", userId);
  if (deleteUserRow.error) {
    return NextResponse.json({ error: deleteUserRow.error.message }, { status: 500 });
  }

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
  }

  await authClient.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url));
}