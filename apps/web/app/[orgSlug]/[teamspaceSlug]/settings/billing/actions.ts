"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { CheckoutPlan } from "@ssota/contracts";
import { checkoutPlanSchema } from "@ssota/contracts";
import { getBillingPort, isBillingEnabled } from "@/lib/billing/provider";
import { orgPath } from "@/lib/console/paths";
import { getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createCheckoutSessionAction(
  orgSlug: string,
  teamspaceSlug: string,
  plan: CheckoutPlan,
) {
  if (!isBillingEnabled()) {
    throw new Error("Billing is disabled in this deployment.");
  }

  const parsedPlan = checkoutPlanSchema.safeParse(plan);
  if (!parsedPlan.success) {
    throw new Error("Invalid plan");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) throw new Error("Organization not found");

  const isAdmin = await consolePort.isOrgBillingAdmin(org.id, user.id);
  if (!isAdmin) throw new Error("Only organization owners can manage billing.");

  const billing = await getBillingPort();
  const seatQuantity = await billing.countBillableSeats(org.id);
  const origin = await requestOrigin();
  const billingPath = orgPath({ orgSlug, teamspaceSlug }, "settings/billing");

  const { url } = await billing.createCheckoutSession({
    organizationId: org.id,
    plan: parsedPlan.data,
    seatQuantity,
    customerEmail: user.email,
    successUrl: `${origin}${billingPath}?checkout=success`,
    cancelUrl: `${origin}${billingPath}?checkout=cancel`,
  });

  redirect(url);
}

export async function createPortalSessionAction(
  orgSlug: string,
  teamspaceSlug: string,
) {
  if (!isBillingEnabled()) {
    throw new Error("Billing is disabled in this deployment.");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) throw new Error("Organization not found");

  const isAdmin = await consolePort.isOrgBillingAdmin(org.id, user.id);
  if (!isAdmin) throw new Error("Only organization owners can manage billing.");

  const billing = await getBillingPort();
  const origin = await requestOrigin();
  const billingPath = orgPath({ orgSlug, teamspaceSlug }, "settings/billing");

  const { url } = await billing.createPortalSession({
    organizationId: org.id,
    returnUrl: `${origin}${billingPath}`,
  });

  redirect(url);
}
