"use client";

import { useLocale } from "@/components/i18n/locale-provider";

type MembersBillableSeatsSummaryProps = {
  billableSeats: number;
  billingEnabled: boolean;
};

export function MembersBillableSeatsSummary({
  billableSeats,
  billingEnabled,
}: MembersBillableSeatsSummaryProps) {
  const { t } = useLocale();

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium">
        {t("settings.membersBillableSeatsLabel", { count: billableSeats })}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {billingEnabled
          ? t("settings.membersBillableSeatsDescriptionBilling")
          : t("settings.membersBillableSeatsDescriptionSelfHost")}
      </p>
    </div>
  );
}
