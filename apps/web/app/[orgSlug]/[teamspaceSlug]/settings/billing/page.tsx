import Link from "next/link";
import { BillingActions } from "@/components/settings/billing-actions";
import { PageHeader } from "@/components/studio/page-header";
import { isBillingEnabled, getBillingPort } from "@/lib/billing/provider";
import { orgPath } from "@/lib/console/paths";
import { getTranslations } from "@/lib/i18n/server";
import { getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.billingTitle")}
        description={t("settings.billingDescription")}
      />

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.billingCurrentPlan")}</CardTitle>
          <CardDescription>{t("settings.billingOrg", { orgSlug })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("settings.billingSeats")}</dt>
              <dd className="font-medium">{billableSeats}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("settings.billingSeatQuantity")}</dt>
              <dd className="font-medium">{entitlement.seatQuantity}</dd>
            </div>
            {entitlement.currentPeriodEnd ? (
              <div>
                <dt className="text-muted-foreground">{t("settings.billingPeriodEnd")}</dt>
                <dd className="font-medium">
                  {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
            {entitlement.cancelAtPeriodEnd ? (
              <div>
                <dt className="text-muted-foreground">{t("settings.billingCancelAtPeriodEnd")}</dt>
                <dd className="font-medium">{t("settings.billingYes")}</dd>
              </div>
            ) : null}
          </dl>

          {!billingEnabled ? (
            <p className="text-sm text-muted-foreground">{t("settings.billingSelfHostMode")}</p>
          ) : (
            <BillingActions
              orgSlug={orgSlug}
              teamspaceSlug={teamspaceSlug}
              isBillingAdmin={isBillingAdmin}
              hasStripeCustomer={Boolean(billingRecord?.stripeCustomerId)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          render={
            <Link href={orgPath({ orgSlug, teamspaceSlug }, "settings/general")} />
          }
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          {t("settings.general")}
        </Button>
      </div>
    </div>
  );
}
