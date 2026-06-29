"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InvitationDetail } from "@ssota/contracts";
import { respondToInvitationAction } from "@/app/settings/member-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { toast } from "@ssota/ui/components/ui/sonner";

type InviteAcceptPanelProps = {
  invitation: InvitationDetail;
  teamspaceSlug: string;
  emailMismatch: boolean;
  userEmail: string;
};

export function InviteAcceptPanel({
  invitation,
  teamspaceSlug,
  emailMismatch,
  userEmail,
}: InviteAcceptPanelProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRespond = (accept: boolean) => {
    startTransition(async () => {
      const result = await respondToInvitationAction({
        invitationId: invitation.id,
        accept,
        teamspaceSlug,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (accept && result.organizationSlug) {
        toast.success(t("settings.membersAcceptSuccess"));
        router.push(
          `/${result.organizationSlug}/${teamspaceSlug}/settings/members`,
        );
        return;
      }
      toast.success(t("settings.membersDeclineSuccess"));
      router.push("/");
    });
  };

  if (emailMismatch) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">{t("settings.inviteWrongEmailTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.inviteWrongEmailBody", {
            inviteEmail: invitation.inviteeEmail,
            currentEmail: userEmail,
          })}
        </p>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">{t("settings.inviteUnavailableTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.inviteUnavailableBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border bg-card p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">{t("settings.invitePageTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.invitePageBody", {
            inviter: invitation.inviterName,
            org: invitation.organizationName,
          })}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() => handleRespond(true)}
        >
          {t("settings.membersAccept")}
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={isPending}
          onClick={() => handleRespond(false)}
        >
          {t("settings.membersDecline")}
        </Button>
      </div>
    </div>
  );
}
