/**
 * ENTERPRISE (.ee) — Stripe BillingPort + webhook handler.
 *
 * Licensed under LICENSE_EE.md.
 */
import type { BillingPort } from "@ssota/core";
import {
  createDbBillingPort,
  createDbBillingReadPort,
  createDbBillingWritePort,
  ensureOrganizationBillingRow,
  getOrganizationIdByStripeCustomerId,
} from "@ssota/adapter-postgres";
import type { Db } from "@ssota/adapter-postgres";
import type Stripe from "stripe";
import {
  getStripeClient,
  getStripePriceId,
  getStripeTrialDays,
  getStripeWebhookSecret,
} from "./stripe-client.ee.js";
import {
  checkoutSessionToBillingSeed,
  subscriptionToBillingRecord,
} from "./sync-subscription.ee.js";

async function resolveOrCreateStripeCustomer(
  db: Db,
  organizationId: string,
  customerEmail?: string | null,
): Promise<string> {
  const read = createDbBillingReadPort(db);
  const existing = await read.getOrganizationBilling(organizationId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: customerEmail ?? undefined,
    metadata: { organizationId },
  });

  const write = createDbBillingWritePort(db);
  await write.upsertOrganizationBilling({
    organizationId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: null,
    plan: "none",
    status: "none",
    seatQuantity: 1,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });

  return customer.id;
}

export function createStripeBillingPort(db: Db): BillingPort {
  const read = createDbBillingReadPort(db);
  const write = createDbBillingWritePort(db);

  return createDbBillingPort(db, {
    async createCheckoutSession(input) {
      await ensureOrganizationBillingRow(db, input.organizationId);
      const customerId = await resolveOrCreateStripeCustomer(
        db,
        input.organizationId,
        input.customerEmail,
      );
      const stripe = getStripeClient();
      const trialDays = getStripeTrialDays();

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: input.organizationId,
        line_items: [
          {
            price: getStripePriceId(input.plan),
            quantity: input.seatQuantity,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          organizationId: input.organizationId,
          plan: input.plan,
        },
        subscription_data: {
          metadata: {
            organizationId: input.organizationId,
            plan: input.plan,
          },
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        },
      });

      if (!session.url) {
        throw new Error("Stripe Checkout session did not return a URL");
      }
      return { url: session.url };
    },

    async createPortalSession(input) {
      const billing = await read.getOrganizationBilling(input.organizationId);
      if (!billing?.stripeCustomerId) {
        throw new Error("No Stripe customer for this organization");
      }
      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: billing.stripeCustomerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    },

    async syncSeatQuantity(organizationId) {
      const billing = await read.getOrganizationBilling(organizationId);
      if (!billing?.stripeSubscriptionId) return;

      const seatQuantity = await read.countBillableSeats(organizationId);
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(
        billing.stripeSubscriptionId,
      );
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) return;

      await stripe.subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ id: itemId, quantity: seatQuantity }],
        proration_behavior: "create_prorations",
      });
    },
  });
}

async function resolveOrganizationIdForSubscription(
  db: Db,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata.organizationId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;
  return getOrganizationIdByStripeCustomerId(db, customerId);
}

async function syncSubscriptionEvent(
  db: Db,
  subscription: Stripe.Subscription,
): Promise<void> {
  const organizationId = await resolveOrganizationIdForSubscription(
    db,
    subscription,
  );
  if (!organizationId) return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;

  const write = createDbBillingWritePort(db);
  await write.upsertOrganizationBilling(
    subscriptionToBillingRecord({
      organizationId,
      subscription,
      stripeCustomerId: customerId,
    }),
  );
}

async function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const legacy = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscription = legacy.subscription;
  if (typeof subscription === "string") return subscription;
  if (subscription && typeof subscription === "object") return subscription.id;

  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  return null;
}

export async function handleStripeWebhook(
  db: Db,
  payload: string,
  signature: string,
): Promise<{ handled: boolean; duplicate?: boolean }> {
  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    getStripeWebhookSecret(),
  );

  const write = createDbBillingWritePort(db);
  const isNew = await write.tryRecordWebhookEvent(event.id);
  if (!isNew) {
    return { handled: true, duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId =
        session.client_reference_id ??
        session.metadata?.organizationId ??
        null;
      if (!organizationId) break;

      const seed = checkoutSessionToBillingSeed({ organizationId, session });
      if (seed) {
        await write.upsertOrganizationBilling(seed);
      }

      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        await syncSubscriptionEvent(db, subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscriptionEvent(db, event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = await getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionEvent(db, subscription);
      }
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = await getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionEvent(db, subscription);
      }
      break;
    }
    default:
      break;
  }

  return { handled: true };
}

export { subscriptionToBillingRecord, checkoutSessionToBillingSeed } from "./sync-subscription.ee.js";
