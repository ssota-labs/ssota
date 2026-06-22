import { redirect } from "next/navigation";
import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";
import { TemplateOnboardingForm } from "@/components/onboarding/template-onboarding-form";
import { DEFAULT_TEMPLATE_ID } from "@/components/onboarding/console-preview-provisioning";
import { getConsolePort, getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OnboardingTemplatePage({
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

  if (profile.onboardingStep === "project") {
    redirect("/onboarding/project");
  }

  const projectName = profile.onboardingDraftProjectName?.trim();
  if (!projectName) {
    redirect("/onboarding/project");
  }

  let organizationName = "Your Organization";
  const consolePort = getConsolePort();
  const personalOrg = await consolePort.getPersonalOrganizationForUser(user.id);
  if (personalOrg) organizationName = personalOrg.name;

  const { error } = await searchParams;
  const templates = BUILTIN_TEMPLATES.map((template) => template.meta);

  return (
    <TemplateOnboardingForm
      organizationName={organizationName}
      projectName={projectName}
      templates={templates}
      defaultTemplateId={DEFAULT_TEMPLATE_ID}
      error={error}
    />
  );
}
