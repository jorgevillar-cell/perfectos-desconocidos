import { redirect } from "next/navigation";

import { getPostLoginRedirectPath } from "@/lib/auth/onboarding";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const destination = await getPostLoginRedirectPath(supabase, user.id);

  redirect(destination);
}
