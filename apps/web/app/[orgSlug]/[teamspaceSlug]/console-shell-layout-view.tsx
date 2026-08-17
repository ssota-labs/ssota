import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { ConsoleShell } from "@/components/console/console-shell";
import { PendingInvitationsBanner } from "@/components/settings/members/pending-invitations-banner";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { listInitiatives } from "@/lib/console/initiatives";
import {
  getConsolePort,
  getOrganizationMembersPort,
  getPagePort,
} from "@/lib/ports";
import type { Organization, Teamspace } from "@ssota/core";

type ConsoleShellLayoutViewProps = {
  orgSlug: string;
  teamspaceSlug: string;
  org: Organization;
  project: Teamspace;
  userId: string;
  userEmail: string;
  returnTo: string;
  children: React.ReactNode;
};

export async function ConsoleShellLayoutView({
  orgSlug,
  teamspaceSlug,
  org,
  project,
  userId,
  userEmail,
  returnTo,
  children,
}: ConsoleShellLayoutViewProps) {
  const consolePort = getConsolePort();
  const [organizations, teamspaceList, initiatives, pendingInvites] =
    await Promise.all([
      consolePort.listOrganizationsForUser(userId),
      consolePort.listTeamspacesForOrganization(org.id),
      listInitiatives(project.id),
      getOrganizationMembersPort().listPendingInvitesForUser(userId),
    ]);

  const pagesByTeamspace = await Promise.all(
    teamspaceList.map((ts) => getPagePort(ts.id).listPages()),
  );

  const pages =
    pagesByTeamspace.find((_, i) => teamspaceList[i]?.id === project.id) ?? [];

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

  const pageTree = pages
    .filter((p) => !p.appliesToNodeType)
    .map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId ?? null,
      position: p.position,
      icon: p.icon ?? null,
    }));

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
    redirect(await getDefaultProjectPath(userId));
  }

  if (returnTo.includes("/design/preview")) {
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
      userEmail={userEmail}
      signOutAction={signOutAction}
      initiatives={initiatives}
      pageTree={pageTree}
      teamspaceNavGroups={teamspaceNavGroups}
      templatesByType={templatesByType}
    >
      <PendingInvitationsBanner
        invitations={pendingInvites}
        defaultTeamspaceSlug={teamspaceSlug}
      />
      {children}
    </ConsoleShell>
  );
}
