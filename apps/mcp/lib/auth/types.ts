export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Pluggable MCP bearer-token auth. The selection of implementation is the
 * open-core boundary:
 *
 *  - `local`    (OSS): single-user; an optional shared secret token.
 *  - `supabase` (Enterprise): verifies Supabase-issued JWTs via JWKS.
 */
export interface McpAuthProvider {
  /** Verify the `Authorization` header and resolve the user, or null. */
  verifyBearerToken(authorization: string | null): Promise<AuthUser | null>;
  /** OAuth authorization servers to advertise in the protected-resource metadata. */
  authServerUrls(): string[];
}
