"use client";

import { useState, useTransition } from "react";
import { updateDisplayNameAction } from "@/app/settings/account-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";

type AccountProfileFormProps = {
  initialDisplayName: string;
};

export function AccountProfileForm({ initialDisplayName }: AccountProfileFormProps) {
  const { t } = useLocale();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateDisplayNameAction(displayName);
      if (result.ok) {
        setMessage(t("settings.profileSaved"));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={isPending}
          aria-label={t("settings.displayNameLabel")}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={isPending || displayName.trim() === initialDisplayName}
      >
        {t("common.save")}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
