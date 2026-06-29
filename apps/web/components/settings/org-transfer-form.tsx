"use client";

import { useState, useTransition } from "react";
import { transferOrganizationOwnershipAction } from "@/app/settings/organization-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type OrgTransferFormProps = {
  organizationId: string;
  orgSlug: string;
};

export function OrgTransferForm({ organizationId, orgSlug }: OrgTransferFormProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await transferOrganizationOwnershipAction({
        organizationId,
        orgSlug,
        newOwnerEmail: email,
      });
      if (result.ok) {
        setMessage(t("settings.orgTransferSuccess"));
        setEmail("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="transfer-email">{t("settings.orgTransferEmailLabel")}</Label>
        <Input
          id="transfer-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@company.com"
          disabled={isPending}
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending || !email.trim()}>
        {t("settings.orgTransferAction")}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
