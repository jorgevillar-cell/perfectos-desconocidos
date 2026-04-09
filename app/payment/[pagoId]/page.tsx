import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function PaymentPage({
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
      <div className="mx-auto max-w-3xl rounded-[32px] border border-[#E5E7EB] bg-white p-8 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#B35C52]">Pagos desactivados</p>
        <h1 className="mt-2 text-[30px] font-bold">Cobros y pagos temporalmente no disponibles</h1>
        <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">
          Por ahora la plataforma solo muestra precios de referencia. No se pueden realizar pagos desde esta pantalla.
        </p>

        <div className="mt-6">
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white"
          >
            Volver a explorar
          </Link>
        </div>
      </div>
    </main>
  );
}