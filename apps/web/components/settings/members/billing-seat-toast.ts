import { toast } from "@ssota/ui/components/ui/sonner";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function showBillingSeatsUpdatedToast(
  t: Translate,
  billableSeats: number,
): void {
  toast.success(t("settings.billingSeatsUpdated", { count: billableSeats }));
}
