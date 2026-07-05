function readPostgresCause(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") return null;
  const wrapped = error as { cause?: unknown };
  const cause = wrapped.cause ?? error;
  if (!cause || typeof cause !== "object") return null;
  return cause as Record<string, unknown>;
}

/** True when Postgres reports undefined_table (42P01). */
export function isPostgresRelationMissingError(
  error: unknown,
  relation?: string,
): boolean {
  const cause = readPostgresCause(error);
  if (!cause || cause.code !== "42P01") return false;
  if (!relation) return true;

  const message =
    typeof cause.message === "string"
      ? cause.message
      : typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  return message.includes(`"${relation}"`) || message.includes(relation);
}
