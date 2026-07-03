/**
 * Live Stripe Checkout / Portal scenarios (agent-browser or manual).
 *
 * Run only when real Stripe test keys and optional browser automation are available:
 *
 *   STRIPE_E2E_LIVE=1 pnpm e2e:billing:live
 *
 * Scenarios: B8, C1–C6, D1–D3, D6, G1, H4
 *
 * @see e2e/helpers/billing-scenarios.ts
 * @see packages/ee/docs/test-clocks.md
 */
import { expect, test } from "@playwright/test";
import { loginAsSmoke } from "../../helpers/auth";
import { gotoProject } from "../../helpers/console";
import { BILLING_SCENARIOS } from "../../helpers/billing-scenarios";

const liveEnabled = process.env.STRIPE_E2E_LIVE === "1";
const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"));

test.describe("billing live Stripe @billing @stripe @live", () => {
  test.skip(
    !liveEnabled || !hasStripeKey,
    "Set STRIPE_E2E_LIVE=1 and STRIPE_SECRET_KEY=sk_test_… to run live Checkout/Portal specs",
  );

  // @billing-scenario B8
  // @billing-scenario G1
  test("Subscribe Starter redirects to checkout.stripe.com", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "settings/billing");

    await page.getByRole("button", { name: /subscribe.*starter/i }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  });

  // @billing-scenario C1
  test("documented: complete Checkout with 4242 test card (agent-browser)", async () => {
    test.info().annotations.push({
      type: "manual",
      description:
        "Use agent-browser on checkout.stripe.com: card 4242 4242 4242 4242, any future expiry/CVC. " +
        "Ensure `stripe listen --forward-to <host>/api/webhooks/stripe` is running.",
    });
    test.fixme(true, "Requires agent-browser card entry on Stripe Hosted Checkout iframe");
  });
});

test.describe("billing live scenario catalog @billing @live", () => {
  test("lists manual/live scenarios for agent-browser runs", async () => {
    const manual = BILLING_SCENARIOS.filter(
      (s) => s.automation === "manual" || s.tier === "e2e-live",
    );
    expect(manual.length).toBeGreaterThan(10);
    test.info().attach("manual-scenarios.json", {
      body: JSON.stringify(manual, null, 2),
      contentType: "application/json",
    });
  });
});
