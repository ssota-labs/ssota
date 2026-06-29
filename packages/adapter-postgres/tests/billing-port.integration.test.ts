import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  assertCloudEntitlement,
  BillingError,
  getEntitlementFromBilling,
} from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createDbBillingReadPort,
  createDbBillingWritePort,
  createNoopBillingPort,
  DEFAULT_ORG_SLUG,
} from "../src/index.js";

loadEnv({ path: new URL("../../../.env.local", import.meta.url).pathname });
loadEnv({ path: new URL("../../../apps/web/.env.local", import.meta.url).pathname });

let skip = false;

describe("billing port integration", () => {
  let db: ReturnType<typeof createDb>["db"] | undefined;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let organizationId: string;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;

      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      organizationId = org.id;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("noop billing port is always entitled", async () => {
    const billing = createNoopBillingPort();
    const entitlement = await billing.getEntitlement(organizationId);
    expect(entitlement.isEntitled).toBe(true);
    expect(entitlement.plan).toBe("self_host");
  });

  it("upserts organization billing and reads entitlement", async () => {
    const read = createDbBillingReadPort(db!);
    const write = createDbBillingWritePort(db!);

    await write.upsertOrganizationBilling({
      organizationId,
      stripeCustomerId: `cus_${randomUUID().slice(0, 8)}`,
      stripeSubscriptionId: `sub_${randomUUID().slice(0, 8)}`,
      plan: "starter",
      status: "active",
      seatQuantity: 2,
      currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    });

    const entitlement = await getEntitlementFromBilling(read, organizationId);
    expect(entitlement.isEntitled).toBe(true);
    expect(entitlement.plan).toBe("starter");
    expect(entitlement.seatQuantity).toBe(2);
  });

  it("rejects past_due entitlement", async () => {
    const read = createDbBillingReadPort(db!);
    const write = createDbBillingWritePort(db!);

    await write.upsertOrganizationBilling({
      organizationId,
      stripeCustomerId: `cus_${randomUUID().slice(0, 8)}`,
      stripeSubscriptionId: `sub_${randomUUID().slice(0, 8)}`,
      plan: "starter",
      status: "past_due",
      seatQuantity: 1,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });

    await expect(assertCloudEntitlement(read, organizationId)).rejects.toBeInstanceOf(
      BillingError,
    );
  });

  it("deduplicates webhook events by event_id", async () => {
    const write = createDbBillingWritePort(db!);
    const eventId = `evt_${randomUUID()}`;

    const first = await write.tryRecordWebhookEvent(eventId);
    const second = await write.tryRecordWebhookEvent(eventId);

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("counts billable seats (owner + member)", async () => {
    const read = createDbBillingReadPort(db!);
    const seats = await read.countBillableSeats(organizationId);
    expect(seats).toBeGreaterThanOrEqual(1);
  });
});
