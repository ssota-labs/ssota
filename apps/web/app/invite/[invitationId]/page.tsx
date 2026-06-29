import { InviteAcceptPanel } from "@/components/settings/members/invite-accept-panel";
import { getConsolePort, getOrganizationMembersPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${invitationId}`)}`);
  }

  const invitation = await getOrganizationMembersPort().getInvitationDetail(
    invitationId,
    user.id,
  );

  if (!invitation) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Invitation not found.</p>
      </div>
    );
  }

  const consolePort = getConsolePort();
  const teamspaces = await consolePort.listTeamspacesForOrganization(
    invitation.organizationId,
  );
  const defaultTeamspace = teamspaces[0]?.slug ?? "ssota-dev";

  const emailMismatch =
    user.email?.toLowerCase() !== invitation.inviteeEmail.toLowerCase();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <InviteAcceptPanel
        invitation={invitation}
        teamspaceSlug={defaultTeamspace}
        emailMismatch={emailMismatch}
        userEmail={user.email ?? ""}
      />
    </div>
  );
}
