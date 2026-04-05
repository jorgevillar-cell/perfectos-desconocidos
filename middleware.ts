import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPostLoginRedirectPath } from "@/lib/auth/onboarding";

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

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPage =
    pathname === "/explore" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/payment");

  if (isAuthPage && user) {
    const destination = await getPostLoginRedirectPath(supabase, user.id);
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (isProtectedPage && !user) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/login", "/register", "/onboarding", "/explore", "/settings/:path*", "/payment/:path*", "/"],
};