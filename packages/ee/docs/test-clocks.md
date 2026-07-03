# Stripe Test Clock scenarios (Cloud billing)

Use [Stripe Test Clocks](https://stripe.com/docs/billing/testing/test-clocks) to validate subscription lifecycle without waiting for real time.

**Quick start:** `pnpm stripe:smoke --clock` prints the step-by-step checklist.  
**CI fixtures:** `pnpm e2e:billing -- tests/billing-stripe/webhook.spec.ts` covers webhook→DB paths without a live clock.

## Prerequisites

| Item | Command / note |
|------|----------------|
| Stripe CLI | `stripe login` (test mode) |
| Web app | `pnpm dev --filter web` — `BILLING=stripe`, `STRIPE_SECRET_KEY=sk_test_…`, price IDs |
| Webhook forward | `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe` |
| Webhook secret | Copy `whsec_…` from listen output → `STRIPE_WEBHOOK_SECRET` in `apps/web/.env.local` |
| Catalog | `pnpm stripe:smoke` — scenario summary |

## Setup

1. Stripe Dashboard → **Developers → Test clocks** → Create clock (e.g. `ssota-billing-e2e`).
2. Create a **Customer** attached to that clock (not a normal test customer).
3. In SSOTA Console, use an **unpaid** org (owner). Start Checkout with that customer, or create a subscription via API with the clock customer id in metadata `organizationId`.
4. Keep `stripe listen` running for all clock advances.

### Verify DB (after each step)

```bash
psql "$DATABASE_URL" -c "
  SELECT status, cancel_at_period_end, current_period_end, seat_quantity
  FROM organization_billing
  WHERE organization_id = '<your-org-uuid>';
"
```

Or open **Settings → Billing** and check badges (status, period end, “Cancels at period end”).

## Scenarios

| ID | Scenario | Clock / action | Expected `organization_billing` | Automated fixture |
|----|----------|----------------|--------------------------------|-------------------|
| **E1** | Trial start | Checkout with trial (`STRIPE_TRIAL_DAYS>0`) or `subscription.created` | `trialing` | webhook `status: trialing` |
| **E2** | Trial end + payment OK | Advance past trial end (card `4242…`) | `active` | webhook trialing → `active` |
| **E3** | Renewal | Advance one billing period | `active`, new `current_period_end` | webhook with later `current_period_end` |
| **E4** | Payment failure | Failing test card `4000000000000341`, advance period | `past_due` | webhook `past_due` + gate E5 |
| **E5** | Gate on past_due | (DB state) | Console redirects to billing | Playwright `gate.spec.ts` |
| **E6** | Cancel scheduled | Portal → cancel at period end | `active` + `cancel_at_period_end=true` | webhook `cancel_at_period_end: true` |
| **E7** | After cancel period | Advance clock past cancel date | `canceled` | Live clock only; E8 covers `subscription.deleted` webhook |
| **E8** | Subscription deleted | Webhook `customer.subscription.deleted` | `canceled` | Playwright `webhook.spec.ts` |

## Step-by-step (E1–E4, E6, E7)

### E1 — Trial start → `trialing`

1. Set `STRIPE_TRIAL_DAYS=14` (or use Stripe trial on price).
2. Complete Checkout for clock customer with card `4242 4242 4242 4242`.
3. Confirm webhook `checkout.session.completed` / `customer.subscription.updated` in listen output.
4. **Expect:** DB `status = trialing`, Console overview **accessible** (entitled).

### E2 — Trial end → `active`

1. From E1 state, in Dashboard advance Test Clock to **day after trial end**.
2. **Expect:** `invoice.payment_succeeded`, DB `status = active`.

### E3 — Renewal → `current_period_end` updates

1. From active subscription, note `current_period_end` in DB/UI.
2. Advance clock **one billing period**.
3. **Expect:** `current_period_end` strictly later than before; status stays `active`.

### E4 — Payment failure → `past_due`

1. Update payment method to [declining card](https://docs.stripe.com/testing#declined-payments) `4000000000000341` (or attach before renewal).
2. Advance clock to trigger invoice.
3. **Expect:** DB `past_due`; visiting `/overview` redirects to **Settings → Billing** (E5).

### E6 — Cancel at period end

1. Open **Manage in Stripe Portal** → cancel subscription at period end.
2. **Expect:** DB `status = active`, `cancel_at_period_end = true`; UI shows cancel-at-period-end badge.

### E7 — After cancel period → `canceled`

1. From E6, advance clock **past** the subscription period end.
2. **Expect:** `customer.subscription.deleted` (or updated `canceled`); DB `status = canceled`; gate blocks overview.

## Customer Portal (D1–D6)

Manual / agent-browser — see `pnpm stripe:smoke` checklist:

- **D1** Portal opens from billing page  
- **D2** Cancel at period end → UI badge (ties to E6)  
- **D3** Resume subscription in Portal  
- **D4** Plan switch → webhook sync (verify DB `plan`)  
- **D5** Seat quantity in Portal (Stripe-only until membership sync ships)  
- **D6** Return URL lands on billing page  

## Seat quantity

After inviting or removing billable members (`owner` / `member`), `syncOrgBillingSeats` runs from onboarding (`completeProfileOnboardingAction`). Verify Stripe subscription item quantity matches `countBillableSeats` when a live subscription exists.

## Integration / unit (no live Stripe)

```bash
pnpm test:billing                    # core + ee + adapter billing-port
pnpm stripe:smoke --run integration # includes web sync-seats test
pnpm e2e:billing                     # gate + webhook Playwright
```

Adapter tests cover DB sync and entitlement with fixture objects. Use `subscriptionToBillingRecord` in `@ssota/ee` for mapping assertions.

## Scenario catalog

Full billing test matrix (IDs A–J) lives in `e2e/helpers/billing-scenarios.ts`. Run automated tiers:

```bash
pnpm stripe:smoke              # summary + manual checklist
pnpm stripe:smoke --clock      # Test Clock runbook E1–E7
pnpm stripe:smoke --run all    # unit + integration + e2e-oss + e2e-stripe
pnpm e2e -- --grep billing     # OSS mode (BILLING=none)
pnpm e2e:billing               # Stripe mode gate + webhook specs
pnpm e2e:billing:record        # Both suites + per-test video in HTML reports
pnpm e2e:billing:open oss      # Local server: OSS report with Video tab per test
pnpm e2e:billing:open stripe   # Local server: Stripe report
pnpm e2e:billing:open hub      # Hub linking both reports
```

Live Checkout/Portal and Test Clock flows are `manual` / `cli` tier — use `stripe listen` and agent-browser as documented in the smoke script output.
