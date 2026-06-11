"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

export function ConsentForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authorizationId) {
        setError(t("oauth.missingAuthorizationId"));
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
        return;
      }
      setDetails(data as Record<string, unknown>);
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
        <CardHeader>
          <CardTitle>{t("oauth.consentTitle")}</CardTitle>
          <CardDescription>{t("oauth.consentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {details && (
            <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
          <div className="flex gap-3">
            <Button type="button" onClick={() => void handleApprove()}>
              {t("oauth.approve")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleDeny()}>
              {t("oauth.deny")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
