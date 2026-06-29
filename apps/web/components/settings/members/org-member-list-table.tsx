"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ssota/ui/components/ui/alert-dialog";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  revokeInvitationAction,
  removeMemberAction,
} from "@/app/settings/member-actions";
import { toast } from "@ssota/ui/components/ui/sonner";
import { cn } from "@ssota/ui/lib/utils";
import { getRoleIcon, getRoleLabel, type MemberRow } from "./org-member-list.types";
import { useState, useTransition } from "react";

type RemoveTarget = {
  userId: string;
  name: string;
  email: string;
};

type OrgMemberListTableProps = {
  rows: MemberRow[];
  isOwner: boolean;
  isPending: boolean;
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
  onChanged: () => void;
  isMobile: boolean;
};

export function OrgMemberListTable({
  rows,
  isOwner,
  isPending,
  organizationId,
  orgSlug,
  teamspaceSlug,
  onChanged,
}: OrgMemberListTableProps) {
  const { t } = useLocale();
  const [actionPending, startAction] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const handleRevoke = (invitationId: string) => {
    startAction(async () => {
      const result = await revokeInvitationAction({
        invitationId,
        orgSlug,
        teamspaceSlug,
      });
      if (result.ok) {
        toast.success(t("settings.membersRevokeSuccess"));
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRemove = (target: RemoveTarget) => {
    startAction(async () => {
      const result = await removeMemberAction({
        organizationId,
        orgSlug,
        teamspaceSlug,
        targetUserId: target.userId,
      });
      if (result.ok) {
        toast.success(t("settings.membersRemoveSuccess"));
        setRemoveTarget(null);
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {t("settings.membersEmpty")}
      </p>
    );
  }

  return (
    <>
    <div className="min-w-0 overflow-x-auto [scrollbar-width:thin]">
      <div className="min-w-[640px] rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.membersColUser")}</TableHead>
              <TableHead>{t("settings.membersColRole")}</TableHead>
              <TableHead>{t("settings.membersColStatus")}</TableHead>
              <TableHead>{t("settings.membersColDate")}</TableHead>
              {isOwner ? <TableHead className="w-[100px]" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(row.type === "pending" && "bg-muted/30")}
              >
                <TableCell className="min-w-0 whitespace-normal">
                  <div className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        row.type === "pending" && "text-muted-foreground",
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="break-all text-xs text-muted-foreground">
                      {row.type === "pending" && row.inviterName
                        ? t("settings.membersInvitedBy", {
                            name: row.inviterName,
                          })
                        : row.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="flex w-fit items-center gap-1"
                  >
                    {getRoleIcon(row.role)}
                    <span>{getRoleLabel(row.role, t)}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={row.type === "pending" ? "secondary" : "default"}
                    className="w-fit"
                  >
                    {row.type === "pending"
                      ? t("settings.membersStatusPending")
                      : t("settings.membersStatusActive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.dateLabel}
                </TableCell>
                {isOwner ? (
                  <TableCell>
                    {row.type === "pending" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending || actionPending}
                        onClick={() => handleRevoke(row.id)}
                      >
                        {t("settings.membersRevoke")}
                      </Button>
                    ) : row.role !== "owner" && row.userId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={isPending || actionPending}
                        onClick={() =>
                          setRemoveTarget({
                            userId: row.userId!,
                            name: row.name,
                            email: row.email,
                          })
                        }
                      >
                        {t("settings.membersRemove")}
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>

    <AlertDialog
      open={removeTarget !== null}
      onOpenChange={(open) => {
        if (!open && !actionPending) setRemoveTarget(null);
      }}
    >
      <AlertDialogContent>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertDialogHeader className="space-y-1 text-left">
            <AlertDialogTitle className="text-sm font-semibold text-destructive">
              {t("settings.membersRemoveDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {removeTarget
                ? t("settings.membersRemoveDialogDescription", {
                    name: removeTarget.name,
                    email: removeTarget.email,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={actionPending || !removeTarget}
            onClick={() => {
              if (removeTarget) handleRemove(removeTarget);
            }}
          >
            {t("settings.membersRemoveConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
