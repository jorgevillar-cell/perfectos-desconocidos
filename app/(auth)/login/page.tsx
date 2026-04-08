import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

type LoginPageSearchParams = {
  next?: string | string[];
};

type LoginPageProps = {
  searchParams?: LoginPageSearchParams | Promise<LoginPageSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next;

  return (
    <AuthShell
      title="Vuelve a conectar con personas y espacios que encajan contigo."
      subtitle="Accede para seguir descubriendo perfiles afines, pisos disponibles y oportunidades de convivencia que se sientan naturales."
      switchPrompt="¿Todavía no tienes cuenta?"
      switchLabel="Crear una cuenta"
      switchHref="/register"
    >
      <AuthForm mode="login" nextPath={nextPath} />
    </AuthShell>
  );
}