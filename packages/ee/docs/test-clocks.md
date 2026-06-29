# Stripe Test Clock scenarios (Cloud billing)

Use [Stripe Test Clocks](https://stripe.com/docs/billing/testing/test-clocks) to validate subscription lifecycle without waiting for real time.

## Setup

1. Create a Test Clock in Stripe Dashboard (Test mode).
2. Create a Customer attached to the clock.
3. Run Checkout or create a subscription for that customer with `STRIPE_TRIAL_DAYS` if testing trials.
4. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Scenarios

| Scenario | Clock action | Expected `organization_billing.status` |
|----------|--------------|----------------------------------------|
| Trial start | Advance 0 days after checkout | `trialing` |
| Trial end + payment OK | Advance past trial | `active` |
| Renewal | Advance one billing period | `active`, updated `current_period_end` |
| Payment failure | Advance with failing test card | `past_due` |
| Cancel at period end | Portal cancel | `active` + `cancel_at_period_end=true` |
| Subscription deleted | Advance past cancel | `canceled` |

## Seat quantity

After inviting or removing billable members (`owner` / `member`), call `syncSeatQuantity` (wired from onboarding and future membership APIs). Verify Stripe subscription item quantity matches `countBillableSeats`.

## Integration tests

Adapter tests cover DB sync and entitlement without live Stripe. Use fixture subscription objects with `subscriptionToBillingRecord` for mapping assertions.

## Scenario catalog

Full billing test matrix (IDs A–J) lives in `e2e/helpers/billing-scenarios.ts`. Run automated tiers:

```bash
pnpm stripe:smoke              # summary + manual checklist
pnpm stripe:smoke --run all    # unit + integration + e2e-oss + e2e-stripe
pnpm e2e -- --grep billing     # OSS mode (BILLING=none)
pnpm e2e:billing               # Stripe mode gate + webhook specs
```

Live Checkout/Portal and Test Clock flows are `manual` / `cli` tier — use `stripe listen` and agent-browser as documented in the smoke script output.
