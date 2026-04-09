"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { smoothScrollToHash } from "@/lib/ui/section-scroll";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  fotoUrl: string | null;
};

type SiteTopNavProps = {
  currentPath: "/" | "/explore";
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function SiteTopNav({ currentPath }: SiteTopNavProps) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/profile/me", { cache: "no-store" });
        const payload = (await response.json()) as {
          authenticated?: boolean;
          user?: SessionUser;
        };

        if (!active) return;

        if (response.ok && payload.authenticated && payload.user) {
          setUser(payload.user);
          return;
        }

        setUser(null);
      } catch {
        if (active) setUser(null);
      }
    })();

    return () => { active = false; };
  }, []);

  const howItWorksHref = `${currentPath}#como-funciona`;
  const contactHref = `${currentPath}#contacto`;

  function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (typeof window === "undefined") return;
    const url = new URL(href, window.location.origin);
    const samePage = url.pathname === window.location.pathname;
    if (!samePage || !url.hash) return;
    event.preventDefault();
    smoothScrollToHash(url.hash);
  }

  // After login redirect to current page; register always goes through onboarding
  const loginHref = `/login?next=${currentPath}`;
  const registerHref = `/register`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5EAF1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          {/* Logo — bigger */}
          <Link href="/" className="inline-flex items-center shrink-0">
            <BrandLogo className="h-16 w-auto" />
          </Link>

          {/* Center nav */}
          <nav className="hidden items-center gap-7 text-[14px] font-semibold text-[#4B5563] lg:flex">
            <Link href="/explore" className="transition hover:text-[#FF6B6B]">Explorar</Link>
            <a
              href={howItWorksHref}
              onClick={(event) => handleAnchorClick(event, howItWorksHref)}
              className="transition hover:text-[#FF6B6B]"
            >
              Cómo funciona
            </a>
            <a
              href={contactHref}
              onClick={(event) => handleAnchorClick(event, contactHref)}
              className="transition hover:text-[#FF6B6B]"
            >
              Contacto
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href={`/profile/${user.id}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D8DEE8] bg-white px-3 text-[14px] font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
              >
                {user.fotoUrl ? (
                  <img
                    src={user.fotoUrl}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE8E4] text-[12px] font-bold text-[#B35C52]">
                    {initials(user.name) || "U"}
                  </span>
                )}
                {user.name}
              </Link>
            ) : (
              <>
                <Link
                  href={registerHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#D8DEE8] bg-white px-4 text-[14px] font-semibold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                >
                  Crear cuenta
                </Link>
                <Link
                  href={loginHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white transition hover:bg-[#F45C5C]"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Spacer updated to match new nav height (logo h-16 + py-2*2 = 68px) */}
      <div aria-hidden="true" className="h-[84px]" />
    </>
  );
}
