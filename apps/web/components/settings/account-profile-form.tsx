"use client";

import { useState, useTransition } from "react";
import { updateDisplayNameAction } from "@/app/settings/account-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { toast } from "@ssota/ui/components/ui/sonner";

type AccountProfileFormProps = {
  initialDisplayName: string;
};

export function AccountProfileForm({ initialDisplayName }: AccountProfileFormProps) {
  const { t } = useLocale();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateDisplayNameAction(displayName);
      if (result.ok) {
        toast.success(t("settings.profileSaved"));
      } else {
        toast.error(result.error);
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
    </form>
  );
}
