import Link from "next/link";
import { BillingActions } from "@/components/settings/billing-actions";
import {
  SettingsPanel,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-panel";
import { isBillingEnabled, getBillingPort } from "@/lib/billing/provider";
import { orgPath } from "@/lib/console/paths";
import { getTranslations } from "@/lib/i18n/server";
import { getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";

function formatPlanLabel(plan: string): string {
  switch (plan) {
    case "starter":
      return "Cloud Starter";
    case "business":
      return "Cloud Business";
    case "enterprise":
      return "Enterprise";
    case "self_host":
      return "Self-host";
    default:
      return "None";
  }
}

function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export default async function SettingsBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { checkout } = await searchParams;
  const { t } = await getTranslations();
  const user = await getCurrentUser();
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);

  if (!org || !user) {
    return null;
  }

  const billing = await getBillingPort();
  const [entitlement, billingRecord, isBillingAdmin, billableSeats] =
    await Promise.all([
      billing.getEntitlement(org.id),
      billing.getOrganizationBilling(org.id),
      consolePort.isOrgBillingAdmin(org.id, user.id),
      billing.countBillableSeats(org.id),
    ]);

  const billingEnabled = isBillingEnabled();
  const membersPath = orgPath({ orgSlug, teamspaceSlug }, "settings/members");

  return (
    <SettingsPanel
      title={t("settings.billingTitle")}
      description={t("settings.billingDescription")}
    >
      {checkout === "success" ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {t("settings.billingCheckoutSuccess")}
        </div>
      ) : null}
      {checkout === "cancel" ? (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("settings.billingCheckoutCancel")}
        </div>
      ) : null}

      <SettingsSection
        title={t("settings.billingCurrentPlan")}
        description={t("settings.billingOrg", { orgSlug })}
      >
        <SettingsRow
          title={t("settings.billingPlanLabel")}
          description={t("settings.billingPlanDescription")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={entitlement.isEntitled ? "default" : "secondary"}>
              {formatPlanLabel(entitlement.plan)}
            </Badge>
            <Badge variant="outline">{formatStatusLabel(entitlement.status)}</Badge>
            {entitlement.isEntitled ? (
              <Badge variant="outline">{t("settings.billingEntitled")}</Badge>
            ) : (
              <Badge variant="destructive">{t("settings.billingNotEntitled")}</Badge>
            )}
          </div>
        </SettingsRow>

        <SettingsRow
          title={t("settings.billingSeats")}
          description={t("settings.billingSeatsDescription")}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">{billableSeats}</p>
            <Button
              render={<Link href={membersPath} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              {t("settings.billingManageMembers")}
            </Button>
          </div>
        </SettingsRow>

        <SettingsRow
          title={t("settings.billingSeatQuantity")}
          description={t("settings.billingSeatQuantityDescription")}
        >
          <p className="text-sm font-medium">{entitlement.seatQuantity}</p>
        </SettingsRow>

        {entitlement.currentPeriodEnd ? (
          <SettingsRow title={t("settings.billingPeriodEnd")}>
            <p className="text-sm font-medium">
              {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
            </p>
          </SettingsRow>
        ) : null}

        {entitlement.cancelAtPeriodEnd ? (
          <SettingsRow title={t("settings.billingCancelAtPeriodEnd")}>
            <p className="text-sm font-medium">{t("settings.billingYes")}</p>
          </SettingsRow>
        ) : null}

        <SettingsRow
          title={t("settings.billingActionsLabel")}
          description={
            billingEnabled
              ? t("settings.billingActionsDescription")
              : t("settings.billingSelfHostMode")
          }
        >
          {billingEnabled ? (
            <BillingActions
              orgSlug={orgSlug}
              teamspaceSlug={teamspaceSlug}
              isBillingAdmin={isBillingAdmin}
              hasStripeCustomer={Boolean(billingRecord?.stripeCustomerId)}
            />
          ) : null}
        </SettingsRow>
      </SettingsSection>
    </SettingsPanel>
  );
}
