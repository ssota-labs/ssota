"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { useLocale } from "@/components/i18n/locale-provider";
import type { OrganizationMembersView } from "@ssota/contracts";
import { MemberInvitationForm } from "./member-invitation-form";

type InviteMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
  view: OrganizationMembersView;
  onSuccess?: () => void;
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  teamspaceSlug,
  view,
  onSuccess,
}: InviteMemberDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("settings.membersInviteTitle")}</DialogTitle>
          <DialogDescription>
            {t("settings.membersInviteDescription")}
          </DialogDescription>
        </DialogHeader>
        <MemberInvitationForm
          organizationId={organizationId}
          orgSlug={orgSlug}
          teamspaceSlug={teamspaceSlug}
          view={view}
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
