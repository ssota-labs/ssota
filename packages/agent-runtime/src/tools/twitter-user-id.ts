import type { Client } from "@xdevplatform/xdk";

const TWITTER_USER_ID_PATTERN = /^\d+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when the value is an X numeric user id, not a Connect/SSOTA subject uuid. */
export function isTwitterNumericUserId(value: string | null | undefined): boolean {
  return Boolean(value && TWITTER_USER_ID_PATTERN.test(value));
}

/**
 * Resolve the authenticated X user's numeric id for `/2/users/:id/*` endpoints.
 * `account_connections.subject_user_id` stores the SSOTA profile id for Connect
 * token minting; the provider id lives in `tenant_id` after OAuth enrichment.
 */
export async function resolveTwitterUserId(
  client: Client,
  hint: string | null | undefined,
): Promise<string> {
  if (isTwitterNumericUserId(hint)) {
    return hint!;
  }

  const me = await client.users.getMe();
  const id = me?.data?.id?.trim();
  if (!id || !isTwitterNumericUserId(id)) {
    const hintKind = hint
      ? UUID_PATTERN.test(hint)
        ? "Connect subject user id"
        : "stored user id"
      : "missing user id";
    throw new Error(
      `Could not resolve X user id from access token (${hintKind} is not an X user id). Reconnect X from Connections.`,
    );
  }
  return id;
}
