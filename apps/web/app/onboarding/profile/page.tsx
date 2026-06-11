import { redirect } from "next/navigation";
import { ProfileOnboardingForm } from "@/components/onboarding/profile-onboarding-form";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getOnboardingPort().getProfile(user.id);
  if (profile?.onboardingStep === "project") {
    redirect("/onboarding/project");
  }

  const { error } = await searchParams;
  const defaultWorkspaceName =
    profile?.displayName ??
    user.email?.split("@")[0]?.replace(/[^A-Za-z0-9 '-]/g, "") ??
    "";

  return (
    <ProfileOnboardingForm
      defaultWorkspaceName={defaultWorkspaceName}
      error={error}
    />
  );
}
