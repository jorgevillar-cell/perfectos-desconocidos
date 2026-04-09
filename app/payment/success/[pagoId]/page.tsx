import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ pagoId: string }>;
}) {
  void params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-10 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF1EE] text-[#C65A54]">
          <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1 className="mt-6 text-[32px] font-bold">Pagos temporalmente desactivados</h1>
        <p className="mt-2 text-[15px] text-[#6B7280]">
          Esta pantalla se mantiene para compatibilidad de enlaces antiguos, pero la plataforma no procesa pagos en este momento.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6B6B] px-5 text-[14px] font-semibold text-white transition active:scale-[0.99]"
          >
            Volver a explorar
          </Link>
        </div>
      </div>
    </main>
  );
}