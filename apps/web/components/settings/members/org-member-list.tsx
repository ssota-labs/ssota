"use client";

import type { OrganizationMembersView } from "@ssota/contracts";
import { useLocale } from "@/components/i18n/locale-provider";
import { useMobileViewport } from "@/lib/hooks/use-mobile-viewport";
import { OrgMemberListTable } from "./org-member-list-table";
import { InviteMemberDialog } from "./invite-member-dialog";
import { Button } from "@ssota/ui/components/ui/button";
import { UserPlusIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { refreshMembersViewAction } from "@/app/settings/member-actions";
import type { MemberRow } from "./org-member-list.types";

type OrgMemberListProps = {
  initialView: OrganizationMembersView;
  isOwner: boolean;
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
};

export function OrgMemberList({
  initialView,
  isOwner,
  organizationId,
  orgSlug,
  teamspaceSlug,
}: OrgMemberListProps) {
  const { t } = useLocale();
  const isMobile = useMobileViewport();
  const [view, setView] = useState(initialView);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const refresh = () => {
    startTransition(async () => {
      const result = await refreshMembersViewAction(organizationId);
      if (result.ok) {
        setView(result.view);
      }
    });
  };

  const removeMemberOptimistic = (userId: string) => {
    setView((prev) => ({
      ...prev,
      currentMembers: prev.currentMembers.filter(
        (member) => member.userId !== userId,
      ),
    }));
  };

  const rows: MemberRow[] = [
    ...view.currentMembers.map((member) => ({
      id: member.userId,
      type: "member" as const,
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      dateLabel: formatDate(member.joinedAt),
    })),
    ...view.pendingInvitations.map((invitation) => ({
      id: invitation.id,
      type: "pending" as const,
      name: invitation.inviteeEmail,
      email: invitation.inviteeEmail,
      role: "member" as const,
      dateLabel: formatDate(invitation.createdAt),
      inviterName: invitation.inviterName,
    })),
  ];

  return (
    <div className="space-y-4">
      {isOwner ? (
        <div className="flex justify-end">
          <Button onClick={() => setInviteOpen(true)} disabled={isPending}>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            {t("settings.membersInviteButton")}
          </Button>
        </div>
      ) : null}

      <OrgMemberListTable
        rows={rows}
        isOwner={isOwner}
        isPending={isPending}
        organizationId={organizationId}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        onChanged={refresh}
        onRemoveOptimistic={removeMemberOptimistic}
        isMobile={isMobile}
      />

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        view={view}
        onSuccess={refresh}
      />
    </div>
  );
}
