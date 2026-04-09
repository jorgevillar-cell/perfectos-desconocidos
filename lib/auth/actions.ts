"use server";

import { redirect } from "next/navigation";

import { getPostLoginRedirectPath } from "@/lib/auth/onboarding";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
};

const initialState: AuthFormState = {
  error: null,
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeNextPath(formData: FormData) {
  const nextPath = getField(formData, "next");

  if (!nextPath) {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}

export async function loginAction(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const nextPath = getSafeNextPath(formData);

  if (!email || !password) {
    return { error: "Completa tu email y contraseña." };
  }

  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!user) {
    return { error: "No se pudo recuperar tu usuario tras iniciar sesión." };
  }

  if (nextPath) {
    redirect(nextPath);
  }

  const destination = await getPostLoginRedirectPath(supabase, user.id);
  redirect(destination);
}

export async function registerAction(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const userType = getField(formData, "userType");
  const nextPath = getSafeNextPath(formData);

  if (!email || !password) {
    return { error: "Completa tu email y contraseña." };
  }

  if (password.length < 8) {
    return { error: "Usa una contraseña de al menos 8 caracteres." };
  }

  if (userType !== "propietario" && userType !== "buscador") {
    return { error: "Selecciona si tienes piso o si buscas piso/companeros." };
  }

  const supabase = await createSupabaseActionClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: userType,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (nextPath) {
    redirect(nextPath);
  }

  redirect("/onboarding");
}

export async function logoutAction() {
  const supabase = await createSupabaseActionClient();
  await supabase.auth.signOut();

  redirect("/login");
}