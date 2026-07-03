import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  createConsolePort,
  createDb,
  createDbBillingReadPort,
  createDbBillingWritePort,
  DEFAULT_ORG_SLUG,
  schema,
} from "@ssota/adapter-postgres";
import type { CloudPlan, SubscriptionStatus } from "@ssota/contracts";

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const E2E_STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e_test_secret_for_billing_specs";

function openDb() {
  return createDb(DEFAULT_DATABASE_URL);
}

export async function getSmokeOrganizationId(): Promise<string> {
  const { db } = openDb();
  const consolePort = createConsolePort(db);
  const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) throw new Error("Default org not found — run pnpm db:seed");
  return org.id;
}

export type SeedBillingInput = {
  organizationId: string;
  status: SubscriptionStatus;
  plan?: CloudPlan;
  seatQuantity?: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
};

export async function seedOrganizationBilling(input: SeedBillingInput): Promise<void> {
  const { db } = openDb();
  const write = createDbBillingWritePort(db);
  const suffix = randomUUID().slice(0, 8);

  await write.upsertOrganizationBilling({
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId ?? `cus_e2e_${suffix}`,
    stripeSubscriptionId: input.stripeSubscriptionId ?? `sub_e2e_${suffix}`,
    plan: input.plan ?? "starter",
    status: input.status,
    seatQuantity: input.seatQuantity ?? 1,
    currentPeriodEnd: input.currentPeriodEnd ?? new Date("2026-12-01T00:00:00.000Z"),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
  });
}

/** Remove billing row so gate treats org as unpaid (no record). */
export async function resetOrganizationBilling(organizationId: string): Promise<void> {
  const { db } = openDb();
  await db
    .delete(schema.organizationBilling)
    .where(eq(schema.organizationBilling.organizationId, organizationId));
}

export async function readBillingStatus(
  organizationId: string,
): Promise<SubscriptionStatus | "missing"> {
  const { db } = openDb();
  const read = createDbBillingReadPort(db);
  const record = await read.getOrganizationBilling(organizationId);
  return record?.status ?? "missing";
}

export async function readOrganizationBilling(organizationId: string) {
  const { db } = openDb();
  const read = createDbBillingReadPort(db);
  return read.getOrganizationBilling(organizationId);
}

export function stripePriceStarter(): string {
  return process.env.STRIPE_PRICE_STARTER ?? "price_starter_e2e";
}

export function stripePriceBusiness(): string {
  return process.env.STRIPE_PRICE_BUSINESS ?? "price_business_e2e";
}

export function buildSubscriptionWebhookPayload(input: {
  eventId: string;
  organizationId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId?: string;
  quantity?: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
}) {
  const periodEnd = Math.floor(
    (input.currentPeriodEnd ?? new Date("2026-12-01T00:00:00.000Z")).getTime() / 1000,
  );
  return {
    id: input.eventId,
    object: "event",
    api_version: "2024-12-18.acacia",
    created: Math.floor(Date.now() / 1000),
    type: "customer.subscription.updated",
    data: {
      object: {
        id: input.subscriptionId,
        object: "subscription",
        customer: input.customerId,
        status: input.status,
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
        metadata: { organizationId: input.organizationId },
        items: {
          data: [
            {
              id: "si_e2e_test",
              quantity: input.quantity ?? 2,
              current_period_end: periodEnd,
              price: { id: input.priceId ?? stripePriceStarter() },
            },
          ],
        },
      },
    },
  };
}

export function buildSubscriptionDeletedPayload(input: {
  eventId: string;
  organizationId: string;
  customerId: string;
  subscriptionId: string;
}) {
  return {
    id: input.eventId,
    object: "event",
    api_version: "2024-12-18.acacia",
    created: Math.floor(Date.now() / 1000),
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: input.subscriptionId,
        object: "subscription",
        customer: input.customerId,
        status: "canceled",
        cancel_at_period_end: false,
        metadata: { organizationId: input.organizationId },
        items: {
          data: [
            {
              id: "si_e2e_test",
              quantity: 1,
              current_period_end: Math.floor(Date.now() / 1000),
              price: { id: stripePriceStarter() },
            },
          ],
        },
      },
    },
  };
}

export async function signStripeWebhook(
  payload: object,
  secret = E2E_STRIPE_WEBHOOK_SECRET,
): Promise<{ body: string; signature: string }> {
  const Stripe = (await import("stripe")).default;
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
  return { body, signature };
}
