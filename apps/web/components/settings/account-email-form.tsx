"use client";

import { useState, useTransition } from "react";
import { updateEmailAction } from "@/app/settings/account-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";

type AccountEmailFormProps = {
  currentEmail: string;
};

export function AccountEmailForm({ currentEmail }: AccountEmailFormProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState(currentEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateEmailAction(email);
      if (result.ok) {
        setMessage(result.message ?? t("settings.emailUpdateSent"));
      } else {
        setError(result.error);
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
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
