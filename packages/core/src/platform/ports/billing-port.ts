import type {
  CheckoutPlan,
  CloudPlan,
  Entitlement,
  SubscriptionStatus,
} from "@ssota/contracts";

export type OrganizationBillingRecord = {
  organizationId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: CloudPlan;
  status: SubscriptionStatus;
  seatQuantity: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
};

export interface BillingReadPort {
  getOrganizationBilling(
    organizationId: string,
  ): Promise<OrganizationBillingRecord | null>;

  countBillableSeats(organizationId: string): Promise<number>;
}

export interface BillingWritePort {
  upsertOrganizationBilling(
    record: Omit<OrganizationBillingRecord, "updatedAt"> & { updatedAt?: Date },
  ): Promise<void>;

  recordWebhookEvent(eventId: string): Promise<boolean>;

  /** @returns true when inserted, false when duplicate */
  tryRecordWebhookEvent(eventId: string): Promise<boolean>;
}

export interface BillingPort extends BillingReadPort {
  getEntitlement(organizationId: string): Promise<Entitlement>;

  createCheckoutSession(input: {
    organizationId: string;
    plan: CheckoutPlan;
    seatQuantity: number;
    customerEmail?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  createPortalSession(input: {
    organizationId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  syncSeatQuantity(organizationId: string): Promise<void>;
}
