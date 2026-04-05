import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crea tu perfil y empieza a encontrar convivencia con buena química."
      subtitle="Regístrate en segundos, completa tu onboarding y entra en una experiencia pensada para conectar de forma humana y sin fricción."
      switchPrompt="¿Ya tienes cuenta?"
      switchLabel="Entrar"
      switchHref="/login"
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}