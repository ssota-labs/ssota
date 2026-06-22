import { redirect } from "next/navigation";
import { ProjectOnboardingForm } from "@/components/onboarding/project-onboarding-form";
import { getConsolePort, getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OnboardingProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(user.id);

  if (!profile || profile.onboardingStep === "profile") {
    redirect("/onboarding/profile");
  }

  let organizationName = "Your Organization";
  const consolePort = getConsolePort();
  const personalOrg = await consolePort.getPersonalOrganizationForUser(user.id);
  if (personalOrg) organizationName = personalOrg.name;

  const { error } = await searchParams;

  return (
    <ProjectOnboardingForm
      organizationName={organizationName}
      defaultProjectName={profile.onboardingDraftProjectName ?? ""}
      showOrganizationCreatedToast={profile.onboardingStep === "project"}
      error={error}
    />
  );
}
