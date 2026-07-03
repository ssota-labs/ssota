import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  buildSubscriptionDeletedPayload,
  buildSubscriptionWebhookPayload,
  E2E_STRIPE_WEBHOOK_SECRET,
  getSmokeOrganizationId,
  readBillingStatus,
  readOrganizationBilling,
  resetOrganizationBilling,
  seedOrganizationBilling,
  signStripeWebhook,
} from "../../helpers/billing";

test.describe("stripe webhook API @billing @stripe @webhook", () => {
  let organizationId: string;
  const customerId = `cus_webhook_${randomUUID().slice(0, 8)}`;
  const subscriptionId = `sub_webhook_${randomUUID().slice(0, 8)}`;

  test.beforeAll(async () => {
    organizationId = await getSmokeOrganizationId();
  });

  test.beforeEach(async () => {
    await resetOrganizationBilling(organizationId);
    await seedOrganizationBilling({
      organizationId,
      status: "trialing",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
  });

  // @billing-scenario F3
  test("rejects webhook with invalid signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: JSON.stringify({ id: "evt_bad" }),
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid",
      },
    });
    expect(response.status()).toBe(400);
  });

  // @billing-scenario C7 (via customer.subscription.updated — no live Stripe retrieve)
  // @billing-scenario E2
  test("customer.subscription.updated syncs organization_billing to active", async ({
    request,
  }) => {
    const event = buildSubscriptionWebhookPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
      status: "active",
      quantity: 2,
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    expect(await readBillingStatus(organizationId)).toBe("active");
  });

  // @billing-scenario E1
  test("subscription.updated with trialing syncs organization_billing", async ({
    request,
  }) => {
    await resetOrganizationBilling(organizationId);
    const event = buildSubscriptionWebhookPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
      status: "trialing",
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    expect(await readBillingStatus(organizationId)).toBe("trialing");
  });

  // @billing-scenario E3
  test("subscription.updated advances current_period_end in DB", async ({
    request,
  }) => {
    const renewalEnd = new Date("2027-06-15T00:00:00.000Z");
    const event = buildSubscriptionWebhookPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
      status: "active",
      currentPeriodEnd: renewalEnd,
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    const record = await readOrganizationBilling(organizationId);
    expect(record?.currentPeriodEnd?.toISOString()).toBe(renewalEnd.toISOString());
  });

  // @billing-scenario E4
  test("subscription.updated with past_due syncs organization_billing", async ({
    request,
  }) => {
    const event = buildSubscriptionWebhookPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
      status: "past_due",
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    expect(await readBillingStatus(organizationId)).toBe("past_due");
  });

  // @billing-scenario E6
  test("subscription.updated sets cancel_at_period_end while active", async ({
    request,
  }) => {
    const event = buildSubscriptionWebhookPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
      status: "active",
      cancelAtPeriodEnd: true,
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    const record = await readOrganizationBilling(organizationId);
    expect(record?.status).toBe("active");
    expect(record?.cancelAtPeriodEnd).toBe(true);
  });

  // @billing-scenario F2
  test("duplicate event_id is acknowledged without changing status twice", async ({
    request,
  }) => {
    const eventId = `evt_${randomUUID()}`;
    const event = buildSubscriptionWebhookPayload({
      eventId,
      organizationId,
      customerId,
      subscriptionId,
      status: "active",
    });
    const { body, signature } = await signStripeWebhook(event);

    const first = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(first.status()).toBe(200);
    const firstJson = (await first.json()) as { duplicate?: boolean };
    expect(firstJson.duplicate).toBeFalsy();

    const second = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(second.status()).toBe(200);
    const secondJson = (await second.json()) as { duplicate?: boolean };
    expect(secondJson.duplicate).toBe(true);
  });

  // @billing-scenario E8
  test("customer.subscription.deleted sets status canceled", async ({ request }) => {
    const event = buildSubscriptionDeletedPayload({
      eventId: `evt_${randomUUID()}`,
      organizationId,
      customerId,
      subscriptionId,
    });
    const { body, signature } = await signStripeWebhook(event);

    const response = await request.post("/api/webhooks/stripe", {
      data: body,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });
    expect(response.status()).toBe(200);
    expect(await readBillingStatus(organizationId)).toBe("canceled");
  });
});

test.describe("webhook disabled guard @billing @stripe", () => {
  test("missing stripe-signature header returns 400", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: "{}",
    });
    expect(response.status()).toBe(400);
  });

  test("uses configured webhook secret", () => {
    expect(E2E_STRIPE_WEBHOOK_SECRET).toMatch(/^whsec_/);
  });
});
