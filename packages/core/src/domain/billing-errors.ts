export type BillingErrorCode =
  | "BILLING_NOT_ENTITLED"
  | "BILLING_FORBIDDEN"
  | "BILLING_NOT_FOUND"
  | "BILLING_MISCONFIGURED";

export class BillingError extends Error {
  constructor(
    public readonly code: BillingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BillingError";
  }
}
