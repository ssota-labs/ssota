-- SSOTA Cloud billing (Stripe subscription mirror + webhook idempotency)

CREATE TABLE IF NOT EXISTS organization_billing (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'none',
  seat_quantity integer NOT NULL DEFAULT 1,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organization_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_organization_billing" ON organization_billing
  FOR ALL USING (false);

CREATE POLICY "deny_all_stripe_webhook_events" ON stripe_webhook_events
  FOR ALL USING (false);
