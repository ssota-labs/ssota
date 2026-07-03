/**
 * SSOT catalog for Stripe Cloud billing test scenarios.
 *
 * IDs match the product test matrix (A–J). Each automated test references an ID
 * via `// @billing-scenario <ID>` so coverage stays in sync.
 *
 * Tiers:
 * - unit / integration — Vitest (`pnpm test:billing`)
 * - e2e-oss — default `pnpm e2e` (BILLING=none)
 * - e2e-stripe — `pnpm e2e:billing` or `pnpm e2e:billing:record` (per-test video in HTML report)
 * - e2e-live — `STRIPE_E2E_LIVE=1` (real Checkout / Portal; agent-browser)
 * - cli — `pnpm stripe:smoke`
 * - manual — documented only (agent-browser / Dashboard)
 */

export type BillingScenarioTier =
  | "unit"
  | "integration"
  | "e2e-oss"
  | "e2e-stripe"
  | "e2e-live"
  | "cli"
  | "manual";

export type BillingScenarioAutomation = "yes" | "skip" | "manual" | "planned";

export type BillingScenario = {
  id: string;
  title: string;
  tier: BillingScenarioTier;
  tags: string[];
  automation: BillingScenarioAutomation;
  /** Playwright / Vitest / script reference */
  spec?: string;
  notes?: string;
};

export const BILLING_SCENARIOS: BillingScenario[] = [
  // ── A. Self-host / OSS (BILLING=none) ──────────────────────────────────
  {
    id: "A1",
    title: "Billing settings page shows self-host message",
    tier: "e2e-oss",
    tags: ["@billing", "@oss"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },
  {
    id: "A2",
    title: "Console pages accessible without entitlement gate",
    tier: "e2e-oss",
    tags: ["@billing", "@oss", "@gate"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },
  {
    id: "A3",
    title: "Webhook route returns 404 when BILLING=none",
    tier: "e2e-oss",
    tags: ["@billing", "@oss", "@webhook"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },
  {
    id: "A4",
    title: "NoopBillingPort always entitled (self_host)",
    tier: "integration",
    tags: ["@billing", "@oss"],
    automation: "yes",
    spec: "packages/adapter-postgres/tests/billing-port.integration.test.ts",
  },
  {
    id: "A5",
    title: "OSS CI build with BILLING=none",
    tier: "unit",
    tags: ["@billing", "@oss", "@ci"],
    automation: "yes",
    spec: ".github/workflows/oss-build.yml",
  },

  // ── B. Cloud gate (BILLING=stripe, DB-seeded entitlement) ────────────────
  {
    id: "B1",
    title: "Unpaid org redirected from overview to billing",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B2",
    title: "Unpaid org can open settings/billing",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B3",
    title: "Unpaid org can open settings/general",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B4",
    title: "Unpaid org blocked from settings/account",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B5",
    title: "Unpaid org blocked from settings/developer",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B6",
    title: "Billing page shows plan controls for owner",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@ui"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "B7",
    title: "Non-owner sees owner-only billing message",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@auth"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
    notes: "Uses seeded member@ssota.test org member.",
  },
  {
    id: "B8",
    title: "Owner Subscribe redirects to Stripe Checkout",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
    notes: "agent-browser: fill 4242 card on checkout.stripe.com",
  },

  // ── C. Checkout + card ───────────────────────────────────────────────────
  {
    id: "C1",
    title: "Starter Checkout success with 4242 test card",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "C2",
    title: "Business Checkout success",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "C3",
    title: "Checkout cancel returns to billing with cancel message",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "C4",
    title: "Real card rejected in test mode",
    tier: "manual",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
  },
  {
    id: "C5",
    title: "Declined test card 4000…0002",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "C6",
    title: "3DS card 4000…0318",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@checkout"],
    automation: "manual",
  },
  {
    id: "C7",
    title: "checkout.session.completed updates organization_billing",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
  },
  {
    id: "C8",
    title: "After entitled status Console overview accessible",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },

  // ── D. Customer Portal ───────────────────────────────────────────────────
  {
    id: "D1",
    title: "Manage in Stripe Portal opens hosted portal",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@portal"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "D2",
    title: "Cancel at period end shows Cancels badge",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@portal"],
    automation: "manual",
  },
  {
    id: "D3",
    title: "Don't cancel subscription reverses cancel schedule",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@portal"],
    automation: "manual",
  },
  {
    id: "D4",
    title: "Portal plan switch syncs plan in DB",
    tier: "cli",
    tags: ["@billing", "@stripe", "@portal", "@webhook"],
    automation: "manual",
    spec: "scripts/stripe-billing-smoke.ts",
  },
  {
    id: "D5",
    title: "Portal seat quantity change",
    tier: "manual",
    tags: ["@billing", "@stripe", "@portal", "@seats"],
    automation: "manual",
    notes: "SSOTA membership sync not wired; Stripe-only quantity change.",
  },
  {
    id: "D6",
    title: "Return from Portal to billing page",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@portal"],
    automation: "manual",
  },

  // ── E. Test Clock ────────────────────────────────────────────────────────
  {
    id: "E1",
    title: "Trial start → status trialing",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
    notes: "Playwright webhook fixture. Live Test Clock: pnpm stripe:smoke --clock",
  },
  {
    id: "E2",
    title: "Trial end + payment OK → active",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
    notes: "Webhook trialing→active fixture. Live clock: test-clocks.md E2",
  },
  {
    id: "E3",
    title: "Billing period renewal updates current_period_end",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
    notes: "Webhook period_end fixture. Live clock: test-clocks.md E3",
  },
  {
    id: "E4",
    title: "Payment failure → past_due",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
    notes: "Webhook past_due fixture + gate E5. Live clock: test-clocks.md E4",
  },
  {
    id: "E5",
    title: "past_due org blocked by entitlement gate",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@gate"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "E6",
    title: "Cancel scheduled: active + cancel_at_period_end",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
    notes: "Webhook cancel_at_period_end fixture. Live Portal+clock: test-clocks.md E6",
  },
  {
    id: "E7",
    title: "After cancel period → canceled",
    tier: "cli",
    tags: ["@billing", "@stripe", "@clock"],
    automation: "manual",
    spec: "scripts/stripe-billing-smoke.ts",
    notes: "Requires Test Clock advance past period. E8 covers subscription.deleted webhook.",
  },
  {
    id: "E8",
    title: "subscription.deleted webhook → canceled",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
  },

  // ── F. Webhook / idempotency ─────────────────────────────────────────────
  {
    id: "F1",
    title: "Signed webhook forwarded via stripe listen (live)",
    tier: "cli",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "manual",
    spec: "scripts/stripe-billing-smoke.ts",
  },
  {
    id: "F2",
    title: "Duplicate event_id not processed twice",
    tier: "integration",
    tags: ["@billing", "@webhook"],
    automation: "yes",
    spec: "packages/adapter-postgres/tests/billing-port.integration.test.ts",
  },
  {
    id: "F3",
    title: "Invalid stripe-signature returns 400",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "yes",
    spec: "billing-stripe/webhook.spec.ts",
  },
  {
    id: "F4",
    title: "stripe trigger dummy event (route alive)",
    tier: "cli",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "manual",
    spec: "scripts/stripe-billing-smoke.ts",
  },
  {
    id: "F5",
    title: "subscriptionToBillingRecord maps active subscription",
    tier: "unit",
    tags: ["@billing", "@webhook"],
    automation: "yes",
    spec: "packages/ee/src/sync-subscription.ee.test.ts",
  },
  {
    id: "F6",
    title: "invoice.payment_failed triggers subscription sync",
    tier: "cli",
    tags: ["@billing", "@stripe", "@webhook"],
    automation: "manual",
    spec: "scripts/stripe-billing-smoke.ts",
    notes:
      "Handler calls stripe.subscriptions.retrieve; use Test Clock + stripe listen, not DB-only E2E.",
  },

  // ── G. Auth / security ───────────────────────────────────────────────────
  {
    id: "G1",
    title: "Owner can start Checkout (redirect)",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@auth"],
    automation: "manual",
    spec: "billing-stripe/ui-live.spec.ts",
  },
  {
    id: "G2",
    title: "Member cannot start Checkout",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@auth"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
    notes: "UI hides Subscribe; server action also rejects non-owner.",
  },
  {
    id: "G3",
    title: "Unauthenticated Checkout action redirects to login",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@auth"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "G4",
    title: "Checkout action throws when BILLING=none",
    tier: "unit",
    tags: ["@billing", "@oss"],
    automation: "skip",
    notes: "Server action; covered indirectly by A1/A3.",
  },

  // ── H. Seats ─────────────────────────────────────────────────────────────
  {
    id: "H1",
    title: "countBillableSeats includes owner (+ member)",
    tier: "integration",
    tags: ["@billing", "@seats"],
    automation: "yes",
    spec: "packages/adapter-postgres/tests/billing-port.integration.test.ts",
  },
  {
    id: "H2",
    title: "Onboarding org creation calls syncSeatQuantity",
    tier: "integration",
    tags: ["@billing", "@seats"],
    automation: "yes",
    spec: "apps/web/lib/billing/sync-seats.test.ts",
    notes: "syncOrgBillingSeats from completeProfileOnboardingAction when BILLING=stripe.",
  },
  {
    id: "H3",
    title: "Member accept/remove syncs Stripe seat quantity",
    tier: "unit",
    tags: ["@billing", "@seats"],
    automation: "yes",
    spec: "apps/web/app/settings/member-actions.billing.test.ts",
    notes: "syncOrgBillingSeats on invitation accept and member remove.",
  },
  {
    id: "H4",
    title: "Checkout line item quantity matches billable seats",
    tier: "e2e-live",
    tags: ["@billing", "@stripe", "@seats"],
    automation: "manual",
  },

  // ── H2. UI / nav / i18n ──────────────────────────────────────────────────
  {
    id: "H2-1",
    title: "Billing link in Settings L1 nav",
    tier: "e2e-oss",
    tags: ["@billing", "@ui", "@nav"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },
  {
    id: "H2-2",
    title: "Billing page i18n heading (en)",
    tier: "e2e-oss",
    tags: ["@billing", "@ui", "@i18n"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },
  {
    id: "H2-3",
    title: "Entitled vs not entitled badges",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@ui"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },
  {
    id: "H2-4",
    title: "Seat count and period end match DB",
    tier: "e2e-stripe",
    tags: ["@billing", "@stripe", "@ui"],
    automation: "yes",
    spec: "billing-stripe/gate.spec.ts",
  },

  // ── I. Already automated commands (reference) ──────────────────────────
  {
    id: "I1",
    title: "pnpm test --filter @ssota/core (entitlement)",
    tier: "unit",
    tags: ["@billing"],
    automation: "yes",
    spec: "packages/core/src/use-cases/billing/assert-cloud-entitlement.test.ts",
  },
  {
    id: "I2",
    title: "pnpm test --filter @ssota/ee (subscription mapping)",
    tier: "unit",
    tags: ["@billing"],
    automation: "yes",
    spec: "packages/ee/src/sync-subscription.ee.test.ts",
  },
  {
    id: "I3",
    title: "pnpm test --filter @ssota/adapter-postgres (billing port)",
    tier: "integration",
    tags: ["@billing"],
    automation: "yes",
    spec: "packages/adapter-postgres/tests/billing-port.integration.test.ts",
  },
  {
    id: "I4",
    title: "pnpm e2e --grep billing (OSS)",
    tier: "e2e-oss",
    tags: ["@billing", "@oss"],
    automation: "yes",
    spec: "billing/oss.spec.ts",
  },

  // ── J. Out of scope / not implemented ────────────────────────────────────
  {
    id: "J1",
    title: "End-user /app entitlement",
    tier: "manual",
    tags: ["@billing", "@out-of-scope"],
    automation: "skip",
  },
  {
    id: "J2",
    title: "Landing pricing Checkout CTA",
    tier: "manual",
    tags: ["@billing", "@out-of-scope"],
    automation: "planned",
  },
  {
    id: "J3",
    title: "past_due grace banner before hard block",
    tier: "manual",
    tags: ["@billing", "@out-of-scope"],
    automation: "skip",
  },
  {
    id: "J4",
    title: "Enterprise admin override",
    tier: "manual",
    tags: ["@billing", "@out-of-scope"],
    automation: "skip",
  },
];

export function scenariosByTier(tier: BillingScenarioTier): BillingScenario[] {
  return BILLING_SCENARIOS.filter((s) => s.tier === tier);
}

export function scenariosByTag(tag: string): BillingScenario[] {
  return BILLING_SCENARIOS.filter((s) => s.tags.includes(tag));
}

export function automatedScenarios(): BillingScenario[] {
  return BILLING_SCENARIOS.filter((s) => s.automation === "yes");
}
