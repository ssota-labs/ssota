import { redirect } from "next/navigation";
import { ProfileOnboardingForm } from "@/components/onboarding/profile-onboarding-form";
import { getConsolePort, getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(user.id);

  if (profile?.onboardingStep === "completed") {
    redirect("/");
  }

  const { error } = await searchParams;

  let defaultWorkspaceName =
    profile?.displayName ??
    user.email?.split("@")[0]?.replace(/[^A-Za-z0-9 '-]/g, "") ??
    "";

  if (profile?.personalOrganizationId) {
    const consolePort = getConsolePort();
    const orgs = await consolePort.listOrganizationsForUser(user.id);
    const org = orgs.find((item) => item.id === profile.personalOrganizationId);
    if (org) defaultWorkspaceName = org.name;
  }

  return (
    <ProfileOnboardingForm
      defaultWorkspaceName={defaultWorkspaceName}
      error={error}
    />
  );
}
