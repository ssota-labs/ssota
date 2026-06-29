import "server-only";
import Stripe from "stripe";
import { planFromStripePriceId } from "./sync-subscription.ee.js";

export { planFromStripePriceId };

let cached: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required when BILLING=stripe");
  }
  cached = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
  return cached;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for Stripe webhooks");
  }
  return secret;
}

export function getStripePriceId(plan: "starter" | "business"): string {
  const envKey =
    plan === "starter" ? "STRIPE_PRICE_STARTER" : "STRIPE_PRICE_BUSINESS";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} is required when BILLING=stripe`);
  }
  return priceId;
}

export function getStripeTrialDays(): number {
  const raw = process.env.STRIPE_TRIAL_DAYS;
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
