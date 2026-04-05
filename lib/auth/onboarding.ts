import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseFromClient = Pick<SupabaseClient, "from">;

export async function hasCompletedOnboarding(
  supabase: SupabaseFromClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("perfil_convivencia")
    .select("userId")
    .eq("userId", userId)
    .maybeSingle();

  // If the lookup fails, default to onboarding to avoid exposing incomplete users to /explore.
  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function getPostLoginRedirectPath(
  supabase: SupabaseFromClient,
  userId: string,
): Promise<"/onboarding" | "/explore"> {
  const completed = await hasCompletedOnboarding(supabase, userId);
  return completed ? "/explore" : "/onboarding";
}