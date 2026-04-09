import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPostLoginRedirectPath } from "@/lib/auth/onboarding";

function getSupabaseProxyConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

async function proxyHandler(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPage =
    pathname === "/onboarding" ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/payment");
  const requiresAuthCheck = isAuthPage || isProtectedPage;

  const supabaseConfig = getSupabaseProxyConfig();
  if (!supabaseConfig.isConfigured) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  let user: { id: string } | null = null;

  if (!requiresAuthCheck) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseConfig.url!, supabaseConfig.key!, {
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
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;

    if (isAuthPage && user) {
      const destination = await getPostLoginRedirectPath(supabase, user.id);
      const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }
  } catch (error) {
    const isRefreshNotFound =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "refresh_token_not_found";

    if (!isRefreshNotFound) {
      console.error("Proxy auth check failed", error);
    }
  }

  if (isProtectedPage && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export { proxyHandler as proxy };
export default proxyHandler;

export const config = {
  matcher: ["/login", "/register", "/onboarding", "/settings/:path*", "/payment/:path*"],
};