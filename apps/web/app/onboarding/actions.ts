"use server";

import { isEnglishDisplayName } from "@loopos/core";
import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

function validationError(message: string, step: "profile" | "project") {
  redirect(`/onboarding/${step}?error=${encodeURIComponent(message)}`);
}

export async function completeProfileOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();

  if (!isEnglishDisplayName(displayName)) {
    validationError(
      "Display name must be 2–64 English letters, numbers, spaces, or hyphens.",
      "profile",
    );
  }

  if (!isEnglishDisplayName(workspaceName)) {
    validationError(
      "Workspace name must be 2–64 English letters, numbers, spaces, or hyphens.",
      "profile",
    );
  }

  const onboardingPort = getOnboardingPort();
  await onboardingPort.completeProfileStep({
    userId: user.id,
    email: user.email ?? "",
    displayName,
    workspaceName,
  });

  redirect("/onboarding/project");
}

export async function completeProjectOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectName = String(formData.get("projectName") ?? "").trim();

  if (!isEnglishDisplayName(projectName)) {
    validationError(
      "Project name must be 2–64 English letters, numbers, spaces, or hyphens.",
      "project",
    );
  }

  const onboardingPort = getOnboardingPort();
  const { organization, project } = await onboardingPort.completeProjectStep({
    userId: user.id,
    projectName,
  });

  redirect(
    projectPath({
      orgSlug: organization.slug,
      projectSlug: project.slug,
    }),
  );
}
