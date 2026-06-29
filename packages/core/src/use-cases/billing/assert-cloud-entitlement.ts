import type { Entitlement } from "@ssota/contracts";
import { BillingError } from "../../domain/billing-errors.js";
import type { BillingReadPort } from "../../ports/billing-port.js";

export function isEntitledStatus(status: Entitlement["status"]): boolean {
  return status === "active" || status === "trialing";
}

export async function getEntitlementFromBilling(
  billing: BillingReadPort,
  organizationId: string,
): Promise<Entitlement> {
  const record = await billing.getOrganizationBilling(organizationId);
  if (!record) {
    return {
      organizationId,
      plan: "self_host",
      status: "none",
      seatQuantity: 1,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isEntitled: false,
    };
  }

  return {
    organizationId,
    plan: record.plan,
    status: record.status,
    seatQuantity: record.seatQuantity,
    currentPeriodEnd: record.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    isEntitled: isEntitledStatus(record.status),
  };
}

export async function assertCloudEntitlement(
  billing: BillingReadPort,
  organizationId: string,
): Promise<Entitlement> {
  const entitlement = await getEntitlementFromBilling(billing, organizationId);
  if (!entitlement.isEntitled) {
    throw new BillingError(
      "BILLING_NOT_ENTITLED",
      "An active SSOTA Cloud subscription is required.",
    );
  }
  return entitlement;
}
