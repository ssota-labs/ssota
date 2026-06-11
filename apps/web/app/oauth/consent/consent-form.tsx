"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  parseOAuthAuthorizationDetails,
  type OAuthAuthorizationDetails,
} from "@/lib/auth/oauth-authorization-details";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

function consentReturnPath(authorizationId: string): string {
  return `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
}

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatScope(
  scope: string,
  t: ReturnType<typeof import("@/lib/i18n").createTranslator>,
): string {
  if (scope === "email") {
    return t("oauth.scopeEmail");
  }
  return t("oauth.scopeUnknown", { scope });
}

export function ConsentForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authorizationId) {
        setError(t("oauth.missingAuthorizationId"));
        setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const next = consentReturnPath(authorizationId);
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      const { data, error: detailsError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (detailsError) {
        setError(detailsError.message);
        setLoading(false);
        return;
      }

      setDetails(parseOAuthAuthorizationDetails(data as Record<string, unknown>));
      setLoading(false);
    }
    void load();
  }, [authorizationId, t]);

  async function handleApprove() {
    if (!authorizationId) return;
    const supabase = createSupabaseBrowserClient();
    const { data, error: approveError } =
      await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (approveError) {
      setError(approveError.message);
      return;
    }
    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    const supabase = createSupabaseBrowserClient();
    const { data, error: denyError } =
      await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (denyError) {
      setError(denyError.message);
      return;
    }
    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }

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
              onClick={() => void handleApprove()}
            >
              {t("oauth.approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !details}
              onClick={() => void handleDeny()}
            >
              {t("oauth.deny")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
