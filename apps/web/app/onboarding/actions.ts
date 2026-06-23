"use server";

import { isDisplayName, isEnglishDisplayName } from "@ssota/core";
import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTemplateBundleById } from "@ssota/adapter-postgres";

function validationError(message: string, step: "profile" | "project" | "template") {
  redirect(`/onboarding/${step}?error=${encodeURIComponent(message)}`);
}

export async function completeProfileOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organizationName = String(formData.get("organizationName") ?? "").trim();

  if (!isEnglishDisplayName(organizationName)) {
    validationError(
      "Organization name must be 2–64 English letters, numbers, spaces, or hyphens.",
      "profile",
    );
  }

  const onboardingPort = getOnboardingPort();
  await onboardingPort.completeProfileStep({
    userId: user.id,
    email: user.email ?? "",
    displayName: organizationName,
    organizationName,
  });

  redirect("/onboarding/project");
}

export async function saveProjectDraftOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectName = String(formData.get("projectName") ?? "").trim();

  if (!isDisplayName(projectName)) {
    validationError(
      "Project name must be 2–64 characters and may use letters, numbers, spaces, or hyphens.",
      "project",
    );
  }

  const onboardingPort = getOnboardingPort();
  await onboardingPort.saveProjectDraftStep({
    userId: user.id,
    projectName,
  });

  redirect("/onboarding/template");
}

export async function completeTemplateOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("templateId") ?? "").trim();
  if (!getTemplateBundleById(templateId)) {
    validationError("Choose a valid project template.", "template");
  }

  const onboardingPort = getOnboardingPort();
  const { organization, project } = await onboardingPort.completeTemplateStep({
    userId: user.id,
    templateId,
  });

  redirect(
    projectPath({
      orgSlug: organization.slug,
      projectSlug: project.slug,
    }),
  );
}
