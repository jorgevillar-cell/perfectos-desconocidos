import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";

export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-10 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#FF6B6B]">Pagos</p>
          <h1 className="mt-2 text-[30px] font-bold">Pagos temporalmente desactivados</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6B7280]">
            De momento la plataforma solo muestra precios orientativos y no procesa cobros ni transferencias.
          </p>
          <div className="mt-6">
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white"
            >
              Volver a explorar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}