import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { resolveOnboardingPath } from "@/lib/onboarding/resolve";
import { resolveOrg } from "@/lib/console/resolve-project";
import { loginRedirect } from "@/lib/auth/login-redirect";
import {
  getAccountReadPort,
  getConsolePort,
  getOnboardingPort,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export type RequestContext =
  | { mode: "builder"; userId: string; orgId: string; teamspaceId: string }
  | { mode: "end_user"; userId: string; teamspaceId: string; accountId: string };

async function requireAuthenticatedUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) loginRedirect(returnTo);
  return user;
}

async function requireOnboardingCompleted(userId: string) {
  const onboardingPort = getOnboardingPort();
  const profile = await onboardingPort.getProfile(userId);
  if (!profile || profile.onboardingStep !== "completed") {
    redirect(resolveOnboardingPath(profile?.onboardingStep));
  }
}

export async function resolveBuilderContext(
  orgSlug: string,
  teamspaceSlug: string,
): Promise<RequestContext & { mode: "builder" }> {
  const requestHeaders = await headers();
  const returnTo =
    requestHeaders.get("x-pathname") ?? `/${orgSlug}/${teamspaceSlug}`;

  const user = await requireAuthenticatedUser(returnTo);
  await requireOnboardingCompleted(user.id);

  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  const consolePort = getConsolePort();
  const organizations = await consolePort.listOrganizationsForUser(user.id);
  if (!organizations.some((item) => item.id === org.id)) {
    redirect(await getDefaultProjectPath(user.id));
  }

  return {
    mode: "builder",
    userId: user.id,
    orgId: org.id,
    teamspaceId: project.id,
  };
}

export async function resolveEndUserContext(
  orgSlug: string,
  teamspaceSlug: string,
): Promise<RequestContext & { mode: "end_user" }> {
  const returnTo = `/app/${orgSlug}/${teamspaceSlug}`;
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);

  if (!project.appEnabled) {
    notFound();
  }

  const user = await requireAuthenticatedUser(returnTo);
  await requireOnboardingCompleted(user.id);

  const account = await getAccountReadPort().provisionForUser(project.id, user.id);

  return {
    mode: "end_user",
    userId: user.id,
    teamspaceId: project.id,
    accountId: account.id,
  };
}

export type EndUserShellContext = {
  orgSlug: string;
  teamspaceSlug: string;
  orgId: string;
  teamspaceId: string;
  accountId: string;
  userEmail: string;
};

export async function resolveEndUserShellContext(
  orgSlug: string,
  teamspaceSlug: string,
): Promise<EndUserShellContext> {
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  const user = await getCurrentUser();

  return {
    orgSlug,
    teamspaceSlug,
    orgId: org.id,
    teamspaceId: project.id,
    accountId: ctx.accountId,
    userEmail: user?.email ?? "",
  };
}
