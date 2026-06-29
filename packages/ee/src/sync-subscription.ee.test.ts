import { describe, expect, it } from "vitest";
import { subscriptionToBillingRecord } from "../src/sync-subscription.ee.js";
import type Stripe from "stripe";

describe("subscriptionToBillingRecord", () => {
  it("maps active subscription fields", () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_test";
    process.env.STRIPE_PRICE_BUSINESS = "price_business_test";

    const subscription = {
      id: "sub_test",
      status: "active",
      cancel_at_period_end: false,
      customer: "cus_test",
      metadata: { organizationId: "00000000-0000-0000-0000-000000000001" },
      items: {
        data: [
          {
            id: "si_test",
            quantity: 3,
            current_period_end: 1_785_148_800,
            price: { id: "price_starter_test" },
          },
        ],
      },
    } as unknown as Stripe.Subscription;

    const record = subscriptionToBillingRecord({
      organizationId: "00000000-0000-0000-0000-000000000001",
      subscription,
      stripeCustomerId: "cus_test",
    });

    expect(record.plan).toBe("starter");
    expect(record.status).toBe("active");
    expect(record.seatQuantity).toBe(3);
    expect(record.stripeSubscriptionId).toBe("sub_test");
  });

  it("maps trialing and cancel_at_period_end", () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_test";

    const subscription = {
      id: "sub_trial",
      status: "trialing",
      cancel_at_period_end: true,
      customer: "cus_test",
      metadata: { organizationId: "00000000-0000-0000-0000-000000000001" },
      items: {
        data: [
          {
            id: "si_test",
            quantity: 1,
            current_period_end: 1_900_000_000,
            price: { id: "price_starter_test" },
          },
        ],
      },
    } as unknown as Stripe.Subscription;

    const record = subscriptionToBillingRecord({
      organizationId: "00000000-0000-0000-0000-000000000001",
      subscription,
      stripeCustomerId: "cus_test",
    });

    expect(record.status).toBe("trialing");
    expect(record.cancelAtPeriodEnd).toBe(true);
  });

  it("maps past_due status", () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_test";

    const subscription = {
      id: "sub_past_due",
      status: "past_due",
      cancel_at_period_end: false,
      customer: "cus_test",
      metadata: { organizationId: "00000000-0000-0000-0000-000000000001" },
      items: { data: [{ id: "si_test", quantity: 1, price: { id: "price_starter_test" } }] },
    } as unknown as Stripe.Subscription;

    const record = subscriptionToBillingRecord({
      organizationId: "00000000-0000-0000-0000-000000000001",
      subscription,
      stripeCustomerId: "cus_test",
    });

    expect(record.status).toBe("past_due");
  });
});
