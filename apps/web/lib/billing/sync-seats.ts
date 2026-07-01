import { getBillingPort, isBillingEnabled } from "./provider";

/** Sync Stripe subscription quantity after membership changes (Cloud only). */
export async function syncOrgBillingSeats(organizationId: string): Promise<void> {
  if (!isBillingEnabled()) return;
  const billing = await getBillingPort();
  await billing.syncSeatQuantity(organizationId);
}

/** Billable seat count when Cloud billing is enabled; otherwise undefined. */
export async function getOrgBillableSeats(
  organizationId: string,
): Promise<number | undefined> {
  if (!isBillingEnabled()) return undefined;
  const billing = await getBillingPort();
  return billing.countBillableSeats(organizationId);
}
