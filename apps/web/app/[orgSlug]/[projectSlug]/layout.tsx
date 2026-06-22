import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import { resolveProject } from "@/lib/console/resolve-project";
import { resolveBuilderContext } from "@/lib/request-context";
import { getConsolePort, getPagePort } from "@/lib/ports";
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
  const [organizations, projects, initiatives, pages] = await Promise.all([
    consolePort.listOrganizationsForUser(builder.userId),
    consolePort.listProjectsForOrganization(org.id),
    listInitiatives(project.id),
    getPagePort(project.id).listPages(),
  ]);

  // Notion-style page tree for the sidebar (minimal serializable fields only).
  // L0 shows only project-level pages; node-type drill-in templates
  // (appliesToNodeType set) render as L1 when drilling into a node.
  const pageTree = pages
    .filter((p) => !p.appliesToNodeType)
    .map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId ?? null,
      position: p.position,
      icon: p.icon ?? null,
    }));

  // Node-type drill-in templates, grouped by catalogKey (static per project).
  // The active node is resolved client-side (NodeDrill context, set by the /n
  // page) so the sidebar L1 swaps correctly across soft navigation.
  const templatesByType: Record<
    string,
    {
      id: string;
      title: string;
      parentId: string | null;
      position: number;
      icon: string | null;
    }[]
  > = {};
  for (const p of pages) {
    if (!p.appliesToNodeType) continue;
    (templatesByType[p.appliesToNodeType] ??= []).push({
      id: p.id,
      title: p.title,
      parentId: p.parentId ?? null,
      position: p.position,
      icon: p.icon ?? null,
    });
  }

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
      pageTree={pageTree}
      templatesByType={templatesByType}
    >
      {children}
    </ConsoleShell>
  );
}
