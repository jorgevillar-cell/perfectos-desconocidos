import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Vuelve a conectar con personas y espacios que encajan contigo."
      subtitle="Accede para seguir descubriendo perfiles afines, pisos disponibles y oportunidades de convivencia que se sientan naturales."
      switchPrompt="¿Todavía no tienes cuenta?"
      switchLabel="Crear una cuenta"
      switchHref="/register"
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}