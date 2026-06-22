import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { resolveProject } from "@/lib/console/resolve-project";
import { loginRedirect } from "@/lib/auth/login-redirect";
import {
  getAccountReadPort,
  getConsolePort,
  getOnboardingPort,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export type RequestContext =
  | { mode: "builder"; userId: string; orgId: string; projectId: string }
  | { mode: "end_user"; userId: string; projectId: string; accountId: string };

async function requireAuthenticatedUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) loginRedirect(returnTo);
  return user;
}

async function requireOnboardingCompleted(userId: string) {
  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(userId);
  if (!profile || profile.onboardingStep !== "completed") {
    redirect(
      !profile || profile.onboardingStep === "profile"
        ? "/onboarding/profile"
        : "/onboarding/project",
    );
  }
}

export async function resolveBuilderContext(
  orgSlug: string,
  projectSlug: string,
): Promise<RequestContext & { mode: "builder" }> {
  const requestHeaders = await headers();
  const returnTo =
    requestHeaders.get("x-pathname") ?? `/${orgSlug}/${projectSlug}`;

  const user = await requireAuthenticatedUser(returnTo);
  await requireOnboardingCompleted(user.id);

  const { org, project } = await resolveProject(orgSlug, projectSlug);
  const consolePort = getConsolePort();
  const organizations = await consolePort.listOrganizationsForUser(user.id);
  if (!organizations.some((item) => item.id === org.id)) {
    redirect(await getDefaultProjectPath(user.id));
  }

  return {
    mode: "builder",
    userId: user.id,
    orgId: org.id,
    projectId: project.id,
  };
}

export async function resolveEndUserContext(
  orgSlug: string,
  projectSlug: string,
): Promise<RequestContext & { mode: "end_user" }> {
  const returnTo = `/app/${orgSlug}/${projectSlug}`;
  const { org, project } = await resolveProject(orgSlug, projectSlug);

  if (!project.appEnabled) {
    notFound();
  }

  const user = await requireAuthenticatedUser(returnTo);
  await requireOnboardingCompleted(user.id);

  const account = await getAccountReadPort().provisionForUser(project.id, user.id);

  return {
    mode: "end_user",
    userId: user.id,
    projectId: project.id,
    accountId: account.id,
  };
}

export type EndUserShellContext = {
  orgSlug: string;
  projectSlug: string;
  orgId: string;
  projectId: string;
  accountId: string;
  userEmail: string;
};

export async function resolveEndUserShellContext(
  orgSlug: string,
  projectSlug: string,
): Promise<EndUserShellContext> {
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const { org, project } = await resolveProject(orgSlug, projectSlug);
  const user = await getCurrentUser();

  return {
    orgSlug,
    projectSlug,
    orgId: org.id,
    projectId: project.id,
    accountId: ctx.accountId,
    userEmail: user?.email ?? "",
  };
}
