import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { CompanyWorkspaceShell } from "@/components/company-workspace/company-workspace-shell";
import { PendingInvitationsBanner } from "@/components/settings/members/pending-invitations-banner";
import { isExpertWorkspaceRelativePath } from "@/lib/company-workspace/navigation";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import {
  getConsolePort,
  getOrganizationMembersPort,
} from "@/lib/ports";
import type { Organization, Teamspace } from "@ssota/core";

type CompanyWorkspaceLayoutViewProps = {
  orgSlug: string;
  teamspaceSlug: string;
  org: Organization;
  project: Teamspace;
  userId: string;
  userEmail: string;
  relativePath: string;
  children: React.ReactNode;
};

export async function CompanyWorkspaceLayoutView({
  orgSlug,
  teamspaceSlug,
  org,
  project,
  userId,
  userEmail,
  relativePath,
  children,
}: CompanyWorkspaceLayoutViewProps) {
  const consolePort = getConsolePort();
  const [organizations, pendingInvites] = await Promise.all([
    consolePort.listOrganizationsForUser(userId),
    getOrganizationMembersPort().listPendingInvitesForUser(userId),
  ]);

  if (!organizations.some((item) => item.id === org.id)) {
    redirect(await getDefaultProjectPath(userId));
  }

  return (
    <CompanyWorkspaceShell
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
      persona={isExpertWorkspaceRelativePath(relativePath) ? "expert" : "customer"}
    >
      <PendingInvitationsBanner
        invitations={pendingInvites}
        defaultTeamspaceSlug={teamspaceSlug}
      />
      {children}
    </CompanyWorkspaceShell>
  );
}
