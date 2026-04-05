import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} in environment variables`);
  }

  return value;
}

const supabaseUrl = requireEnv(process.env.SUPABASE_URL, "SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  "SUPABASE_SERVICE_ROLE_KEY",
);

async function createSupabaseClient(mutable: boolean) {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!mutable) {
          return;
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function createSupabaseServerClient() {
  return createSupabaseClient(false);
}

export async function createSupabaseActionClient() {
  return createSupabaseClient(true);
}