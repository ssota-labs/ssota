"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { OAuthAuthorizationDetails } from "@/lib/auth/oauth-authorization-details";
import { OAuthConsentView } from "../oauth-consent-view";

const mockDetails: OAuthAuthorizationDetails = {
  clientName: "Cursor",
  clientLogoUri: null,
  userEmail: "felix@paxhumana.io",
  scopes: ["email"],
};

export function OAuthConsentPreview() {
  const { t } = useLocale();

  return (
    <OAuthConsentView
      t={t}
      details={mockDetails}
      loading={false}
      error={null}
      onApprove={() => {}}
      onDeny={() => {}}
    />
  );
}
