import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getSupabaseServerConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration in environment variables");
  }

  return { url, key };
}

async function createSupabaseClient(mutable: boolean) {
  const { url, key } = getSupabaseServerConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
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