"use client";

import { useState, useTransition } from "react";
import { updatePasswordAction } from "@/app/settings/account-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { toast } from "@ssota/ui/components/ui/sonner";

export function AccountPasswordForm() {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordAction(password);
      if (result.ok) {
        toast.success(t("settings.passwordSaved"));
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("settings.newPasswordLabel")}</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t("settings.confirmPasswordLabel")}</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending || password.length < 8}>
        {t("settings.updatePassword")}
      </Button>
    </form>
  );
}
