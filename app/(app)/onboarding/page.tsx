import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const metaType = user.user_metadata?.user_type;
  const userType = metaType === "propietario" ? "propietario" : "buscador";

  return <OnboardingFlow userId={user.id} email={user.email ?? ""} userType={userType} />;
}