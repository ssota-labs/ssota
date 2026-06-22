import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import { resolveProject } from "@/lib/console/resolve-project";
import { resolveBuilderContext } from "@/lib/request-context";
import { getConsolePort } from "@/lib/ports";
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

  const builder = await resolveBuilderContext(orgSlug, projectSlug);
  const { org, project } = await resolveProject(orgSlug, projectSlug);
  const user = await getCurrentUser();

  const consolePort = getConsolePort();
  const [organizations, projects, initiatives] = await Promise.all([
    consolePort.listOrganizationsForUser(builder.userId),
    consolePort.listProjectsForOrganization(org.id),
    listInitiatives(project.id),
  ]);

  if (!organizations.some((item) => item.id === org.id)) {
    redirect(await getDefaultProjectPath(builder.userId));
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
      userEmail={user?.email ?? ""}
      signOutAction={signOutAction}
      initiatives={initiatives}
    >
      {children}
    </ConsoleShell>
  );
}
