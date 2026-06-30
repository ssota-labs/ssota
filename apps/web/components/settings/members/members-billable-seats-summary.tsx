"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { orgPath } from "@/lib/console/paths";
import { Button } from "@ssota/ui/components/ui/button";

type MembersBillableSeatsSummaryProps = {
  billableSeats: number;
  billingEnabled: boolean;
  orgSlug: string;
  teamspaceSlug: string;
};

export function MembersBillableSeatsSummary({
  billableSeats,
  billingEnabled,
  orgSlug,
  teamspaceSlug,
}: MembersBillableSeatsSummaryProps) {
  const { t } = useLocale();
  const billingHref = orgPath({ orgSlug, teamspaceSlug }, "settings/billing");

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">
          {t("settings.membersBillableSeatsLabel", { count: billableSeats })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {billingEnabled
            ? t("settings.membersBillableSeatsDescriptionBilling")
            : t("settings.membersBillableSeatsDescriptionSelfHost")}
        </p>
      </div>
      {billingEnabled ? (
        <Button
          render={<Link href={billingHref} />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          {t("settings.billingViewBilling")}
        </Button>
      ) : null}
    </div>
  );
}
