"use server";

import { isDisplayName, isEnglishDisplayName } from "@ssota/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setActiveTeamspace } from "@/lib/console/active-teamspace";
import { DEFAULT_LANDING_SEGMENT } from "@/lib/company-workspace/navigation";
import { orgPath } from "@/lib/console/paths";
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
  const { organization } = await onboardingPort.completeProfileStep({
    userId: user.id,
    email: user.email ?? "",
    displayName: organizationName,
    organizationName,
  });

  const { syncOrgBillingSeats } = await import("@/lib/billing/sync-seats");
  await syncOrgBillingSeats(organization.id);

  redirect("/onboarding/project");
}

export async function saveProjectDraftOnboardingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectName = String(formData.get("projectName") ?? "").trim();

  if (!isDisplayName(projectName)) {
    validationError(
      "Teamspace name must be 2–64 characters and may use letters, numbers, spaces, or hyphens.",
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

  // flat 콘솔 URL은 proxy가 활성 teamspace 쿠키로 rewrite한다 — 새 teamspace를 여기서 활성화하고
  // /{org}가 아니라 랜딩(/{org}/overview)으로 직접 보낸다. (/{org} 라우트 핸들러는 서버 액션
  // redirect의 대상이 되면 headless soft-nav 스톨 — /auth/continue 교훈)
  setActiveTeamspace(await cookies(), project.slug);
  redirect(
    orgPath(
      { orgSlug: organization.slug, teamspaceSlug: project.slug },
      DEFAULT_LANDING_SEGMENT,
    ),
  );
}
