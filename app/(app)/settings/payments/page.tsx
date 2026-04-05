import { redirect } from "next/navigation";

import { ConnectBankAccountButton } from "@/components/payments/connect-bank-account-button";
import { PaymentsStatusCard } from "@/components/payments/payments-status-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getConnectAccountStatus, getPrimaryPisoForUser } from "@/lib/payments/service";
import { formatMoney } from "@/lib/stripe";

export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [status, piso, params] = await Promise.all([getConnectAccountStatus(user.id), getPrimaryPisoForUser(user.id), searchParams]);
  const stripeNotice = params.stripe === "return" ? "Stripe ha terminado de redirigirte de vuelta. Revisa el estado de tu cuenta." : null;

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-10 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#FF6B6B]">Pagos</p>
          <h1 className="mt-2 text-[30px] font-bold">Conecta tu cuenta para recibir pagos</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6B7280]">
            Conecta tu cuenta bancaria con Stripe Connect para cobrar el primer mes de alquiler dentro de la plataforma de forma segura.
          </p>

          {stripeNotice ? <div className="mt-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] font-semibold text-[#92400E]">{stripeNotice}</div> : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ConnectBankAccountButton />
            <span className="rounded-full bg-[#FFF5F5] px-3 py-2 text-[13px] font-semibold text-[#FF6B6B]">
              Estado actual: {status.status === "pendiente" ? "pendiente de verificar" : status.status === "verificada" ? "verificada" : status.status === "lista" ? "lista para recibir pagos" : "con algún problema"}
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <PaymentsStatusCard
            title="Cuenta bancaria"
            description={
              status.status === "pendiente"
                ? "Aún no has conectado tu cuenta Stripe Connect."
                : status.status === "lista"
                  ? "Tu cuenta ya está lista para recibir transferencias."
                  : status.status === "problema"
                    ? "Stripe ha detectado un problema o documentación pendiente."
                    : "La cuenta está verificada y esperando la activación completa."
            }
            tone={status.status === "lista" ? "success" : status.status === "problema" ? "danger" : status.status === "pendiente" ? "warning" : "neutral"}
          />

          <PaymentsStatusCard
            title="Tu primer piso"
            description={piso ? `${piso.direccion ?? piso.zona} · ${formatMoney(Number(piso.precio))}` : "No hemos encontrado todavía un piso conectado a tu cuenta."}
            tone={piso ? "success" : "warning"}
          />
        </section>

        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
          <h2 className="text-[20px] font-bold">Estado de la cuenta</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PaymentsStatusCard
              title="Pendiente de verificar"
              description="Debes completar el onboarding de Stripe Connect antes de poder recibir fondos."
              tone={status.status === "pendiente" ? "warning" : "neutral"}
            />
            <PaymentsStatusCard
              title="Verificada"
              description="Stripe ha recibido los datos básicos de la cuenta bancaria y del titular."
              tone={status.status === "verificada" ? "success" : "neutral"}
            />
            <PaymentsStatusCard
              title="Lista para recibir pagos"
              description="La cuenta está activa, los payouts están habilitados y no hay requisitos pendientes."
              tone={status.status === "lista" ? "success" : "neutral"}
            />
          </div>
        </section>
      </div>
    </main>
  );
}