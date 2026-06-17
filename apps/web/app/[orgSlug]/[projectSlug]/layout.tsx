import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import { resolveProject } from "@/lib/console/resolve-project";
import { loginRedirect } from "@/lib/auth/login-redirect";
import { getConsolePort, getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const requestHeaders = await headers();
  const returnTo =
    requestHeaders.get("x-pathname") ?? `/${orgSlug}/${projectSlug}`;

  const user = await getCurrentUser();
  if (!user) loginRedirect(returnTo);

  const consolePort = getConsolePort();
  const onboardingPort = getOnboardingPort();

  const profile = await onboardingPort.getProfile(user.id);

  if (!profile || profile.onboardingStep !== "completed") {
    redirect(
      !profile || profile.onboardingStep === "profile"
        ? "/onboarding/profile"
        : "/onboarding/project",
    );
  }

  const { org, project } = await resolveProject(orgSlug, projectSlug);

  const [organizations, projects, initiatives] = await Promise.all([
    consolePort.listOrganizationsForUser(user.id),
    consolePort.listProjectsForOrganization(org.id),
    listInitiatives(project.id),
  ]);

  if (!organizations.some((item) => item.id === org.id)) {
    redirect(await getDefaultProjectPath(user.id));
  }

  const isPreviewEmbed = returnTo.includes("/design/preview");

  if (isPreviewEmbed) {
    return <>{children}</>;
  }

  return (
    <ConsoleShell
      ctx={{
        orgSlug,
        projectSlug,
        orgId: org.id,
        projectId: project.id,
        org,
        project,
      }}
      organizations={organizations}
      projects={projects}
      userEmail={user.email ?? ""}
      signOutAction={signOutAction}
      initiatives={initiatives}
    >
      {children}
    </ConsoleShell>
  );
}
