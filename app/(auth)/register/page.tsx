import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

type RegisterPageSearchParams = {
  next?: string | string[];
};

type RegisterPageProps = {
  searchParams?: RegisterPageSearchParams | Promise<RegisterPageSearchParams>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next;

  return (
    <AuthShell
      title="Crea tu perfil y empieza a encontrar convivencia con buena química."
      subtitle="Regístrate en segundos, completa tu onboarding y entra en una experiencia pensada para conectar de forma humana y sin fricción."
      switchPrompt="¿Ya tienes cuenta?"
      switchLabel="Entrar"
      switchHref="/login"
    >
      <AuthForm mode="register" nextPath={nextPath} />
    </AuthShell>
  );
}