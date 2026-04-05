import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  switchLabel: string;
  switchHref: string;
  switchPrompt: string;
  children: React.ReactNode;
};

function TrustDot({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm shadow-black/5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6B6B]/12 text-[#FF6B6B]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20 8.5V6.4a1.4 1.4 0 0 0-.9-1.3l-6-2.4a1.4 1.4 0 0 0-1 0l-6 2.4A1.4 1.4 0 0 0 5 6.4v5.2c0 4.2 2.8 7.9 7 9 4.2-1.1 7-4.8 7-9" />
          <path d="m9.5 12 1.8 1.8L14.8 10.3" />
        </svg>
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  switchLabel,
  switchHref,
  switchPrompt,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#F8F8F8] text-slate-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute left-0 top-0 -z-10 h-72 w-72 rounded-full bg-[#FF6B6B]/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="mx-auto grid min-h-screen max-w-6xl px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <main className="flex items-center py-6 lg:py-12">
            <div className="w-full max-w-xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-black/5">
                <span className="h-3 w-3 rounded-full bg-[#FF6B6B]" />
                Perfectos Desconocidos
              </div>

              <h1 className="mt-8 max-w-lg text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                {subtitle}
              </p>

              <div className="mt-10 rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
                {children}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <TrustDot label="Seguro" />
                <TrustDot label="Gratis" />
                <TrustDot label="Sin spam" />
              </div>

              <p className="mt-8 text-sm text-slate-600">
                {switchPrompt}{" "}
                <Link
                  href={switchHref}
                  className="font-semibold text-[#FF6B6B] transition-colors hover:text-[#ff5757]"
                >
                  {switchLabel}
                </Link>
              </p>
            </div>
          </main>

          <aside className="hidden items-center justify-end lg:flex">
            <div className="w-full max-w-md rounded-[2.5rem] border border-white/80 bg-white/85 p-8 shadow-[0_30px_100px_rgba(255,107,107,0.15)] backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF6B6B]/10 px-3 py-1 text-sm font-medium text-[#FF6B6B]">
                Conexión real
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
                Encuentra convivencia que se sienta natural.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Un espacio claro, cálido y sin fricción para descubrir pisos,
                compartir hábitos y conectar con personas compatibles.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl bg-[#F8F8F8] p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Habitaciones y convivencia
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Prioriza estilos de vida, presupuesto y compatibilidad real.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF4F0] p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Flujo simple
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Regístrate, completa tu onboarding y empieza a explorar.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}