"use client";

import { useState, useTransition } from "react";
import { updateOrganizationNameAction } from "@/app/settings/organization-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";

type OrgNameFormProps = {
  organizationId: string;
  orgSlug: string;
  initialName: string;
  canEdit: boolean;
};

export function OrgNameForm({
  organizationId,
  orgSlug,
  initialName,
  canEdit,
}: OrgNameFormProps) {
  const { t } = useLocale();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateOrganizationNameAction({
        organizationId,
        orgSlug,
        name,
      });
      if (result.ok) {
        setMessage(t("settings.orgNameSaved"));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!canEdit || isPending}
          aria-label={t("settings.orgNameLabel")}
        />
      </div>
      {canEdit ? (
        <Button type="submit" size="sm" disabled={isPending || name.trim() === initialName}>
          {t("common.save")}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t("settings.ownerOnly")}</p>
      )}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
