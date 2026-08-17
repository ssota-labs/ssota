import { describe, expect, it } from "vitest";
import type { BillingReadPort } from "../../ports/billing-port.js";
import {
  assertCloudEntitlement,
  getEntitlementFromBilling,
  isEntitledStatus,
} from "./assert-cloud-entitlement.js";
import { BillingError } from "../../domain/billing-errors.js";

describe("isEntitledStatus", () => {
  it("allows active and trialing only", () => {
    expect(isEntitledStatus("active")).toBe(true);
    expect(isEntitledStatus("trialing")).toBe(true);
    expect(isEntitledStatus("past_due")).toBe(false);
    expect(isEntitledStatus("canceled")).toBe(false);
    expect(isEntitledStatus("none")).toBe(false);
  });
});

describe("assertCloudEntitlement", () => {
  const orgId = "00000000-0000-0000-0000-000000000001";

  it("passes for active subscription", async () => {
    const billing: BillingReadPort = {
      async getOrganizationBilling() {
        return {
          organizationId: orgId,
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          plan: "starter",
          status: "active",
          seatQuantity: 2,
          currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        };
      },
      async countBillableSeats() {
        return 2;
      },
    };

    const entitlement = await assertCloudEntitlement(billing, orgId);
    expect(entitlement.isEntitled).toBe(true);
  });

  it("rejects missing billing record", async () => {
    const billing: BillingReadPort = {
      async getOrganizationBilling() {
        return null;
      },
      async countBillableSeats() {
        return 1;
      },
    };

    await expect(assertCloudEntitlement(billing, orgId)).rejects.toBeInstanceOf(
      BillingError,
    );
  });

  it("returns non-entitled snapshot without throwing from getter", async () => {
    const billing: BillingReadPort = {
      async getOrganizationBilling() {
        return {
          organizationId: orgId,
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          plan: "starter",
          status: "past_due",
          seatQuantity: 1,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        };
      },
      async countBillableSeats() {
        return 1;
      },
    };

    const entitlement = await getEntitlementFromBilling(billing, orgId);
    expect(entitlement.isEntitled).toBe(false);
  });
});
