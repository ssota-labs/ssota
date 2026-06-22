import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signOutAction } from "@/app/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import { resolveProject } from "@/lib/console/resolve-project";
import { loginRedirect } from "@/lib/auth/login-redirect";
import {
  getConsolePort,
  getOnboardingPort,
  getPagePort,
  getGraphPorts,
} from "@/lib/ports";
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

  const [organizations, projects, initiatives, pages] = await Promise.all([
    consolePort.listOrganizationsForUser(user.id),
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

  // Node drill-in (L1): when on /{org}/{proj}/n/{nodeId}, resolve the node's
  // catalogKey and surface that type's templates (appliesToNodeType) as the L1
  // nav, scoped to this node. Generic replacement for the initiative slider.
  const projectBase = `/${orgSlug}/${projectSlug}`;
  const relative = returnTo.startsWith(projectBase)
    ? returnTo.slice(projectBase.length)
    : "";
  const nodeMatch = relative.match(/^\/n\/([^/]+)/);
  let nodeNav: {
    nodeId: string;
    pages: {
      id: string;
      title: string;
      parentId: string | null;
      position: number;
      icon: string | null;
    }[];
  } | null = null;
  if (nodeMatch) {
    const nodeId = nodeMatch[1]!;
    const node = await getGraphPorts(project.id).graphRead.getNodeById(nodeId);
    if (node && node.projectId === project.id) {
      nodeNav = {
        nodeId,
        pages: pages
          .filter((p) => p.appliesToNodeType === node.catalogKey)
          .map((p) => ({
            id: p.id,
            title: p.title,
            parentId: p.parentId ?? null,
            position: p.position,
            icon: p.icon ?? null,
          })),
      };
    }
  }

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
      pageTree={pageTree}
      nodeNav={nodeNav}
    >
      {children}
    </ConsoleShell>
  );
}
