import type { BillingPort } from "@ssota/core";
import { createNoopBillingPort } from "@ssota/adapter-postgres";
import { getDb } from "@/lib/ports";

let cached: BillingPort | undefined;

export function selectBillingMode(): "none" | "stripe" {
  const explicit = process.env.BILLING;
  if (explicit === "none" || explicit === "stripe") return explicit;
  return "none";
}

export function isBillingEnabled(): boolean {
  return selectBillingMode() === "stripe";
}

/** Resolve billing port (cached). Set `BILLING=none|stripe`. */
export async function getBillingPort(): Promise<BillingPort> {
  if (cached) return cached;

  if (selectBillingMode() === "stripe") {
    const mod = await import("@ssota/ee");
    cached = mod.createStripeBillingPort(getDb());
  } else {
    cached = createNoopBillingPort();
  }
  return cached;
}
