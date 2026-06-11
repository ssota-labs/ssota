import { redirect } from "next/navigation";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getOnboardingPort().getProfile(user.id);
  if (profile?.onboardingStep === "completed") {
    redirect(await getDefaultProjectPath(user.id));
  }

  return children;
}
