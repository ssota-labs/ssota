export type AccountErrorCode = "ACCOUNT_FORBIDDEN" | "ACCOUNT_NOT_FOUND";

export class AccountError extends Error {
  constructor(
    public readonly code: AccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}
