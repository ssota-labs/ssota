"use client";

import type { CheckoutPlan } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { useTransition } from "react";
import {
  createCheckoutSessionAction,
  createPortalSessionAction,
} from "@/app/[orgSlug]/[teamspaceSlug]/settings/billing/actions";

type BillingActionsProps = {
  orgSlug: string;
  teamspaceSlug: string;
  isBillingAdmin: boolean;
  hasStripeCustomer: boolean;
};

export function BillingActions({
  orgSlug,
  teamspaceSlug,
  isBillingAdmin,
  hasStripeCustomer,
}: BillingActionsProps) {
  const [pending, startTransition] = useTransition();

  if (!isBillingAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Only organization owners can start or manage a subscription.
      </p>
    );
  }

  function startCheckout(plan: CheckoutPlan) {
    startTransition(async () => {
      await createCheckoutSessionAction(orgSlug, teamspaceSlug, plan);
    });
  }

  function openPortal() {
    startTransition(async () => {
      await createPortalSessionAction(orgSlug, teamspaceSlug);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => startCheckout("starter")}
      >
        Subscribe — Starter
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => startCheckout("business")}
      >
        Subscribe — Business
      </Button>
      {hasStripeCustomer ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={openPortal}
        >
          Manage in Stripe Portal
        </Button>
      ) : null}
    </div>
  );
}
