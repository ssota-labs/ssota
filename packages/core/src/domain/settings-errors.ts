export type SettingsErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "PRECONDITION_FAILED"
  | "CONFIRMATION_MISMATCH"
  | "INVITATION_ALREADY_EXISTS"
  | "ALREADY_MEMBER"
  | "INVITATION_EXPIRED"
  | "CANNOT_REMOVE_OWNER";

export class SettingsError extends Error {
  readonly code: SettingsErrorCode;

  constructor(code: SettingsErrorCode, message: string) {
    super(message);
    this.name = "SettingsError";
    this.code = code;
  }
}
