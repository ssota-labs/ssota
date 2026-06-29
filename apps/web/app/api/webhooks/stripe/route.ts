import { NextResponse } from "next/server";
import { isBillingEnabled } from "@/lib/billing/provider";
import { getDb } from "@/lib/ports";

export async function POST(request: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: "Billing disabled" }, { status: 404 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const { handleStripeWebhook } = await import("@ssota/ee");
    const result = await handleStripeWebhook(getDb(), payload, signature);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
