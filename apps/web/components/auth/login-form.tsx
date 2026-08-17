"use client";

import { signInAction } from "@/app/login/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Separator } from "@ssota/ui/components/ui/separator";

type LoginFormProps = {
  error?: string;
  googleAuthEnabled?: boolean;
  next?: string;
};

export function LoginForm({
  error,
  googleAuthEnabled = false,
  next,
}: LoginFormProps) {
  const { t } = useLocale();

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle>{t("auth.title")}</CardTitle>
        <CardDescription>{t("auth.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signInAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            {t("common.signIn")}
          </Button>
        </form>
        {googleAuthEnabled ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">{t("common.or")}</span>
              <Separator className="flex-1" />
            </div>
            <GoogleSignInButton next={next} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
