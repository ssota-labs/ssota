import { and, eq, inArray } from "drizzle-orm";
import type {
  BillingPort,
  BillingReadPort,
  BillingWritePort,
  OrganizationBillingRecord,
} from "@ssota/core";
import { getEntitlementFromBilling } from "@ssota/core";
import type { Entitlement } from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const BILLABLE_ROLES = ["owner", "member"] as const;

function mapBillingRow(
  row: typeof schema.organizationBilling.$inferSelect,
): OrganizationBillingRecord {
  return {
    organizationId: row.organizationId,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    plan: row.plan as OrganizationBillingRecord["plan"],
    status: row.status as OrganizationBillingRecord["status"],
    seatQuantity: row.seatQuantity,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    updatedAt: row.updatedAt,
  };
}

export function createDbBillingReadPort(db: Db): BillingReadPort {
  return {
    async getOrganizationBilling(organizationId) {
      const rows = await db
        .select()
        .from(schema.organizationBilling)
        .where(eq(schema.organizationBilling.organizationId, organizationId))
        .limit(1);
      const row = rows[0];
      return row ? mapBillingRow(row) : null;
    },

    async countBillableSeats(organizationId) {
      const rows = await db
        .select({ id: schema.organizationMemberships.id })
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, organizationId),
            inArray(schema.organizationMemberships.role, [...BILLABLE_ROLES]),
          ),
        );
      return Math.max(1, rows.length);
    },
  };
}

export function createDbBillingWritePort(db: Db): BillingWritePort {
  return {
    async upsertOrganizationBilling(record) {
      await db
        .insert(schema.organizationBilling)
        .values({
          organizationId: record.organizationId,
          stripeCustomerId: record.stripeCustomerId,
          stripeSubscriptionId: record.stripeSubscriptionId,
          plan: record.plan,
          status: record.status,
          seatQuantity: record.seatQuantity,
          currentPeriodEnd: record.currentPeriodEnd,
          cancelAtPeriodEnd: record.cancelAtPeriodEnd,
          updatedAt: record.updatedAt ?? new Date(),
        })
        .onConflictDoUpdate({
          target: schema.organizationBilling.organizationId,
          set: {
            stripeCustomerId: record.stripeCustomerId,
            stripeSubscriptionId: record.stripeSubscriptionId,
            plan: record.plan,
            status: record.status,
            seatQuantity: record.seatQuantity,
            currentPeriodEnd: record.currentPeriodEnd,
            cancelAtPeriodEnd: record.cancelAtPeriodEnd,
            updatedAt: record.updatedAt ?? new Date(),
          },
        });
    },

    async recordWebhookEvent(eventId) {
      await db.insert(schema.stripeWebhookEvents).values({ eventId });
      return true;
    },

    async tryRecordWebhookEvent(eventId) {
      const inserted = await db
        .insert(schema.stripeWebhookEvents)
        .values({ eventId })
        .onConflictDoNothing()
        .returning({ eventId: schema.stripeWebhookEvents.eventId });
      return inserted.length > 0;
    },
  };
}

export function createNoopBillingPort(): BillingPort {
  const selfHostEntitlement = (
    organizationId: string,
  ): Entitlement => ({
    organizationId,
    plan: "self_host",
    status: "active",
    seatQuantity: 1,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isEntitled: true,
  });

  return {
    async getOrganizationBilling(organizationId) {
      return {
        organizationId,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        plan: "self_host",
        status: "active",
        seatQuantity: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      };
    },

    async countBillableSeats() {
      return 1;
    },

    async getEntitlement(organizationId) {
      return selfHostEntitlement(organizationId);
    },

    async createCheckoutSession() {
      throw new Error("Billing is disabled in self-host mode (BILLING=none).");
    },

    async createPortalSession() {
      throw new Error("Billing is disabled in self-host mode (BILLING=none).");
    },

    async syncSeatQuantity() {
      // no-op
    },
  };
}

export function createDbBillingPort(
  db: Db,
  delegate: Pick<
    BillingPort,
    "createCheckoutSession" | "createPortalSession" | "syncSeatQuantity"
  >,
): BillingPort {
  const read = createDbBillingReadPort(db);
  return {
    ...read,
    async getEntitlement(organizationId) {
      return getEntitlementFromBilling(read, organizationId);
    },
    createCheckoutSession: delegate.createCheckoutSession,
    createPortalSession: delegate.createPortalSession,
    syncSeatQuantity: delegate.syncSeatQuantity,
  };
}

export async function getOrganizationIdByStripeCustomerId(
  db: Db,
  stripeCustomerId: string,
): Promise<string | null> {
  const rows = await db
    .select({ organizationId: schema.organizationBilling.organizationId })
    .from(schema.organizationBilling)
    .where(eq(schema.organizationBilling.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}

export async function ensureOrganizationBillingRow(
  db: Db,
  organizationId: string,
): Promise<void> {
  await db
    .insert(schema.organizationBilling)
    .values({ organizationId })
    .onConflictDoNothing();
}

export { BILLABLE_ROLES };
