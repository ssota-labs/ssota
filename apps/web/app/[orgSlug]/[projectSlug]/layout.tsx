import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { resolveProject } from "@/lib/console/resolve-project";
import { getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgSlug, projectSlug } = await params;
  const { org, project } = await resolveProject(orgSlug, projectSlug);
  const consolePort = getConsolePort();

  const organizations = await consolePort.listOrganizationsForUser(user.id);
  if (!organizations.some((item) => item.id === org.id)) {
    redirect("/login");
  }

  const projects = await consolePort.listProjectsForOrganization(org.id);
  await consolePort.setUserProjectPreference(user.id, orgSlug, projectSlug);

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
    >
      {children}
    </ConsoleShell>
  );
}
