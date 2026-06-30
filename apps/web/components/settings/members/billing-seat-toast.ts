import { toast } from "@ssota/ui/components/ui/sonner";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type BillingSeatsToastOptions = {
  onViewBilling?: () => void;
};

export function showBillingSeatsUpdatedToast(
  t: Translate,
  billableSeats: number,
  options?: BillingSeatsToastOptions,
): void {
  toast.success(t("settings.billingSeatsUpdated", { count: billableSeats }), {
    action: options?.onViewBilling
      ? {
          label: t("settings.billingViewBilling"),
          onClick: options.onViewBilling,
        }
      : undefined,
  });
}
