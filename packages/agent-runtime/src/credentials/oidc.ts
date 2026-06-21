/**
 * Vercel OIDC webhook verification (Connect intake model).
 *
 * In the multi-tenant SaaS setup the Slack app's Event Subscription URL points
 * at Vercel Connect's intake, not at us. Connect verifies the event with Slack
 * (the classic HMAC signing-secret check happens there), then forwards it to our
 * trigger destination with a Vercel OIDC bearer token. So our job shifts from
 * "is this really from Slack?" (signing secret) to "is this really from our
 * Connect deployment?" (OIDC) — `verifyVercelOidcToken` checks the JWT against
 * Vercel's JWKS and, by default, matches project_id + environment.
 *
 * This is the seam the `@chat-adapter/slack` adapter exposes via `webhookVerifier`
 * (which takes precedence over `signingSecret`). Resolved through a dynamic import
 * so `@vercel/oidc` stays optional, mirroring how `@vercel/connect` is wired.
 */

const BEARER_TOKEN_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * A webhook verifier compatible with `@chat-adapter/slack`'s `webhookVerifier`
 * option: resolves truthy to accept the request, throws to reject (→ 401).
 */
export type OidcWebhookVerifier = (request: Request) => Promise<true>;

/**
 * Build a verifier that accepts a request only if it carries a valid Vercel
 * OIDC bearer token (i.e. it was forwarded by our Connect intake).
 *
 * Set `CONNECT_STUB=1` to bypass verification for local/dev and e2e, matching
 * the stub behaviour of the Connect authorization flow.
 */
export function createVercelOidcVerifier(): OidcWebhookVerifier {
  return async (request) => {
    if (process.env.CONNECT_STUB === "1") {
      return true;
    }

    const token = request.headers
      .get("authorization")
      ?.match(BEARER_TOKEN_PATTERN)?.[1]
      ?.trim();
    if (!token) {
      throw new Error("Missing Authorization bearer token");
    }

    let oidc: {
      verifyVercelOidcToken: (token: string) => Promise<unknown>;
    };
    try {
      oidc = (await import("@vercel/oidc")) as unknown as typeof oidc;
    } catch {
      throw new Error(
        "@vercel/oidc is not installed — add it to verify Connect intake webhooks",
      );
    }

    await oidc.verifyVercelOidcToken(token);
    return true;
  };
}
