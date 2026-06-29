"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/mixpanel";
import { useLocale } from "@/components/i18n/locale-provider";

type SubmitState = "idle" | "loading" | "success" | "error";

type LandingBetaSignupProps = {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "lg";
  triggerClassName?: string;
};

export function LandingBetaSignup({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "lg",
  triggerClassName,
}: LandingBetaSignupProps) {
  const { t } = useLocale();
  const resolvedTriggerLabel = triggerLabel ?? t("landing.beta.defaultTrigger");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");
    setMessage(null);
    track(AnalyticsEvents.betaSignupSubmitted, { source: "landing" });

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        const errorMessage = data.error ?? t("landing.beta.errorFallback");
        setSubmitState("error");
        setMessage(errorMessage);
        track(AnalyticsEvents.betaSignupFailed, {
          source: "landing",
          error: errorMessage,
        });
        return;
      }

      track(AnalyticsEvents.betaSignupCompleted, { source: "landing" });
      setSubmitState("success");
      setMessage(t("landing.beta.success"));
      setEmail("");
    } catch {
      const errorMessage = t("landing.beta.networkError");
      setSubmitState("error");
      setMessage(errorMessage);
      track(AnalyticsEvents.betaSignupFailed, {
        source: "landing",
        error: errorMessage,
      });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      track(AnalyticsEvents.betaSignupDialogOpened, { source: "landing" });
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubmitState("idle");
      setMessage(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          />
        }
      >
        {resolvedTriggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("landing.beta.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("landing.beta.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {submitState === "success" ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="beta-email">{t("landing.beta.emailLabel")}</Label>
              <Input
                id="beta-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t("landing.beta.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitState === "loading"}
              />
            </div>
            {submitState === "error" && message ? (
              <p className="text-sm text-destructive">{message}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={submitState === "loading" || email.trim().length === 0}
              >
                {submitState === "loading"
                  ? t("landing.beta.submitting")
                  : t("landing.beta.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
