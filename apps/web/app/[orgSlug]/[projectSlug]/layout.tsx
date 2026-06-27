import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveBuilderContext } from "@/lib/request-context";
import { getConsolePort, getPagePort, registerTeamspaceOrganization } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const requestHeaders = await headers();
  const returnTo =
    requestHeaders.get("x-pathname") ?? `/${orgSlug}/${teamspaceSlug}`;

  const builder = await resolveBuilderContext(orgSlug, teamspaceSlug);
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  registerTeamspaceOrganization(project.id, org.id);
  const user = await getCurrentUser();

  const consolePort = getConsolePort();
  const [organizations, teamspaceList, initiatives] = await Promise.all([
    consolePort.listOrganizationsForUser(builder.userId),
    consolePort.listTeamspacesForOrganization(org.id),
    listInitiatives(project.id),
  ]);

  const pagesByTeamspace = await Promise.all(
    teamspaceList.map((ts) => getPagePort(ts.id).listPages()),
  );

  const pages = pagesByTeamspace.find((_, i) => teamspaceList[i]?.id === project.id) ?? [];

  const teamspaceNavGroups = teamspaceList.map((teamspace, index) => {
    const tsPages = pagesByTeamspace[index] ?? [];
    return {
      teamspace,
      pages: tsPages
        .filter((p) => !p.appliesToNodeType)
        .map((p) => ({
          id: p.id,
          title: p.title,
          parentId: p.parentId ?? null,
          position: p.position,
          icon: p.icon ?? null,
        })),
    };
  });

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
        teamspaceSlug,
        orgId: org.id,
        teamspaceId: project.id,
        org,
        project,
      }}
      organizations={organizations}
      projects={teamspaceList}
      userEmail={user?.email ?? ""}
      signOutAction={signOutAction}
      initiatives={initiatives}
      pageTree={pageTree}
      teamspaceNavGroups={teamspaceNavGroups}
      templatesByType={templatesByType}
    >
      {children}
    </ConsoleShell>
  );
}
