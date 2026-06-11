"use client";

import type { OAuthAuthorizationDetails } from "@/lib/auth/oauth-authorization-details";
import type { createTranslator } from "@/lib/i18n";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@ssota/ui/components/ui/avatar";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

type Translator = ReturnType<typeof createTranslator>;

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatScope(scope: string, t: Translator): string {
  if (scope === "email") {
    return t("oauth.scopeEmail");
  }
  return t("oauth.scopeUnknown", { scope });
}

type OAuthConsentViewProps = {
  t: Translator;
  details: OAuthAuthorizationDetails | null;
  loading: boolean;
  error: string | null;
  onApprove: () => void;
  onDeny: () => void;
};

export function OAuthConsentView({
  t,
  details,
  loading,
  error,
  onApprove,
  onDeny,
}: OAuthConsentViewProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-8">
      <Card>
        <CardHeader className="space-y-4">
          {details && (
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {details.clientLogoUri ? (
                  <AvatarImage
                    src={details.clientLogoUri}
                    alt={details.clientName}
                  />
                ) : null}
                <AvatarFallback>{clientInitials(details.clientName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl">{details.clientName}</CardTitle>
                <CardDescription>
                  {t("oauth.clientRequest", { client: details.clientName })}
                </CardDescription>
              </div>
            </div>
          )}
          {!details && (
            <>
              <CardTitle>{t("oauth.consentTitle")}</CardTitle>
              <CardDescription>{t("oauth.consentDescription")}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && !error && (
            <p className="text-sm text-muted-foreground">{t("oauth.loading")}</p>
          )}
          {details && (
            <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
              {details.userEmail && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("oauth.signedInAs")}
                  </p>
                  <p className="text-sm font-medium">{details.userEmail}</p>
                </div>
              )}
              {details.scopes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("oauth.permissionsTitle")}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {details.scopes.map((scope) => (
                      <li key={scope}>{formatScope(scope, t)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              disabled={loading || !details}
              onClick={onApprove}
            >
              {t("oauth.approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !details}
              onClick={onDeny}
            >
              {t("oauth.deny")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
