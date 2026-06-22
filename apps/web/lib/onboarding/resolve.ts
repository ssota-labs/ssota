import { getDefaultProjectPath } from "@/lib/console/default-landing";
import type { OnboardingStep } from "@ssota/core";
import { getOnboardingPort } from "@/lib/ports";

export function resolveOnboardingPath(step: OnboardingStep | undefined): string {
  switch (step) {
    case "profile":
      return "/onboarding/profile";
    case "project":
      return "/onboarding/project";
    case "template":
      return "/onboarding/template";
    case "completed":
      return "/onboarding/profile";
    default:
      return "/onboarding/profile";
  }
}

export async function resolvePostAuthPath(userId: string): Promise<string> {
  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(userId);

  if (!profile || profile.onboardingStep !== "completed") {
    return resolveOnboardingPath(profile?.onboardingStep);
  }

  return getDefaultProjectPath(userId);
}
