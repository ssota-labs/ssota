import { getBillingPort, isBillingEnabled } from "./provider";

/** Sync Stripe subscription quantity after membership changes (Cloud only). */
export async function syncOrgBillingSeats(organizationId: string): Promise<void> {
  if (!isBillingEnabled()) return;
  const billing = await getBillingPort();
  await billing.syncSeatQuantity(organizationId);
}
