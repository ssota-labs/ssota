"use client";

import { useState, useTransition } from "react";
import { deleteOrganizationAction } from "@/app/settings/organization-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { toast } from "@ssota/ui/components/ui/sonner";

type OrgDeleteFormProps = {
  organizationId: string;
  orgSlug: string;
  teamspaceCount: number;
};

export function OrgDeleteForm({
  organizationId,
  orgSlug,
  teamspaceCount,
}: OrgDeleteFormProps) {
  const { t } = useLocale();
  const [confirmSlug, setConfirmSlug] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await deleteOrganizationAction({
        organizationId,
        orgSlug,
        confirmSlug,
      });
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  const blocked = teamspaceCount > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {blocked ? (
        <p className="text-sm text-muted-foreground">
          {t("settings.orgDeleteBlocked", { count: teamspaceCount })}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="confirm-slug">
              {t("settings.orgDeleteConfirmLabel", { slug: orgSlug })}
            </Label>
            <Input
              id="confirm-slug"
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              placeholder={orgSlug}
              disabled={isPending}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={isPending || confirmSlug !== orgSlug}
          >
            {t("settings.orgDeleteAction")}
          </Button>
        </>
      )}
    </form>
  );
}
