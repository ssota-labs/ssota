"use client";

import { useState, useTransition } from "react";
import { updateEmailAction } from "@/app/settings/account-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { toast } from "@ssota/ui/components/ui/sonner";

type AccountEmailFormProps = {
  currentEmail: string;
};

export function AccountEmailForm({ currentEmail }: AccountEmailFormProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState(currentEmail);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateEmailAction(email);
      if (result.ok) {
        toast.success(result.message ?? t("settings.emailUpdateSent"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Input
          id="account-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending}
          aria-label={t("settings.emailLabel")}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={isPending || email.trim().toLowerCase() === currentEmail.toLowerCase()}
      >
        {t("settings.updateEmail")}
      </Button>
    </form>
  );
}
