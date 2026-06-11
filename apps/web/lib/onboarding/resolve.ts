import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { getOnboardingPort } from "@/lib/ports";

export async function resolvePostAuthPath(userId: string): Promise<string> {
  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(userId);

  if (!profile || profile.onboardingStep === "profile") {
    return "/onboarding/profile";
  }

  if (profile.onboardingStep === "project") {
    return "/onboarding/project";
  }

  return getDefaultProjectPath(userId);
}
