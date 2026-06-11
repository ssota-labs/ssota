"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  parseOAuthAuthorizationDetails,
  type OAuthAuthorizationDetails,
} from "@/lib/auth/oauth-authorization-details";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OAuthConsentView } from "./oauth-consent-view";

function consentReturnPath(authorizationId: string): string {
  return `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
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
    <OAuthConsentView
      t={t}
      details={details}
      loading={loading}
      error={error}
      onApprove={() => void handleApprove()}
      onDeny={() => void handleDeny()}
    />
  );
}
