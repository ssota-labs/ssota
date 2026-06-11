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

  let workspaceName = "Your Workspace";
  if (profile.personalOrganizationId) {
    const consolePort = getConsolePort();
    const orgs = await consolePort.listOrganizationsForUser(user.id);
    const org = orgs.find((item) => item.id === profile.personalOrganizationId);
    if (org) workspaceName = org.name;
  }

  const { error } = await searchParams;

  return <ProjectOnboardingForm workspaceName={workspaceName} error={error} />;
}
