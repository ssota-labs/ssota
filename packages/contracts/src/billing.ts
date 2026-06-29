import { z } from "zod";

export const cloudPlanSchema = z.enum([
  "none",
  "starter",
  "business",
  "enterprise",
  "self_host",
]);
export type CloudPlan = z.infer<typeof cloudPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const entitlementSchema = z.object({
  organizationId: z.string().uuid(),
  plan: cloudPlanSchema,
  status: subscriptionStatusSchema,
  seatQuantity: z.number().int().positive(),
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  isEntitled: z.boolean(),
});
export type Entitlement = z.infer<typeof entitlementSchema>;

export const checkoutPlanSchema = z.enum(["starter", "business"]);
export type CheckoutPlan = z.infer<typeof checkoutPlanSchema>;
