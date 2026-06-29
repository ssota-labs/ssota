/**
 * ENTERPRISE (.ee) — Stripe subscription sync helpers.
 *
 * Licensed under LICENSE_EE.md.
 */
import type { CloudPlan, SubscriptionStatus } from "@ssota/contracts";
import type { OrganizationBillingRecord } from "@ssota/core";
import type Stripe from "stripe";

export function planFromStripePriceId(priceId: string): "starter" | "business" {
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "starter";
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "unpaid":
      return "unpaid";
    default:
      return "none";
  }
}

export function subscriptionToBillingRecord(input: {
  organizationId: string;
  subscription: Stripe.Subscription;
  stripeCustomerId: string;
}): OrganizationBillingRecord {
  const item = input.subscription.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan: CloudPlan = priceId
    ? planFromStripePriceId(priceId)
    : "starter";

  return {
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.subscription.id,
    plan,
    status: mapStripeSubscriptionStatus(input.subscription.status),
    seatQuantity: Math.max(1, item?.quantity ?? 1),
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end,
    updatedAt: new Date(),
  };
}

export function checkoutSessionToBillingSeed(input: {
  organizationId: string;
  session: Stripe.Checkout.Session;
}): OrganizationBillingRecord | null {
  const customerId =
    typeof input.session.customer === "string"
      ? input.session.customer
      : input.session.customer?.id;
  const subscriptionId =
    typeof input.session.subscription === "string"
      ? input.session.subscription
      : input.session.subscription?.id;

  if (!customerId) return null;

  return {
    organizationId: input.organizationId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId ?? null,
    plan: "starter",
    status: "trialing",
    seatQuantity: 1,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  };
}
