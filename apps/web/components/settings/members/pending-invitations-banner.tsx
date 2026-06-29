"use client";

import type { InvitationSummary } from "@ssota/contracts";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToInvitationAction } from "@/app/settings/member-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { toast } from "@ssota/ui/components/ui/sonner";

type PendingInvitationsBannerProps = {
  invitations: InvitationSummary[];
  defaultTeamspaceSlug: string;
};

export function PendingInvitationsBanner({
  invitations,
  defaultTeamspaceSlug,
}: PendingInvitationsBannerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  const handleRespond = (invitationId: string, accept: boolean, orgSlug: string) => {
    startTransition(async () => {
      const result = await respondToInvitationAction({
        invitationId,
        accept,
        teamspaceSlug: defaultTeamspaceSlug,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (accept) {
        toast.success(t("settings.membersAcceptSuccess"));
        router.push(`/${orgSlug}/${defaultTeamspaceSlug}/settings/members`);
      } else {
        toast.success(t("settings.membersDeclineSuccess"));
        router.refresh();
      }
    });
  };

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm">
              {t("settings.pendingInviteBanner", {
                inviter: invitation.inviterName,
                org: invitation.organizationName,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  handleRespond(invitation.id, true, invitation.organizationSlug)
                }
              >
                {t("settings.membersAccept")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  handleRespond(invitation.id, false, invitation.organizationSlug)
                }
              >
                {t("settings.membersDecline")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
