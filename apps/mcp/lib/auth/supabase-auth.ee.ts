import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthUser, McpAuthProvider } from "./types";

/**
 * ENTERPRISE (.ee) — Supabase JWT auth for the MCP server.
 *
 * Licensed under LICENSE_EE.md. Selected by `AUTH=supabase` (or auto-detected
 * when `NEXT_PUBLIC_SUPABASE_URL` is set). Verifies Supabase-issued access
 * tokens against the project's JWKS and advertises the Supabase auth server in
 * the OAuth protected-resource metadata.
 */
function supabaseAuthIssuerUrl(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
): string {
  return `${url.replace(/\/$/, "")}/auth/v1`;
}

export function createSupabaseMcpAuthProvider(): McpAuthProvider {
  const issuer = supabaseAuthIssuerUrl();
  const jwks = createRemoteJWKSet(
    new URL(`${issuer}/.well-known/jwks.json`),
  );

  return {
    async verifyBearerToken(authorization: string | null): Promise<AuthUser | null> {
      if (!authorization?.startsWith("Bearer ")) return null;
      const token = authorization.slice("Bearer ".length);
      try {
        const { payload } = await jwtVerify(token, jwks, { issuer });
        const sub = payload.sub;
        if (!sub) return null;
        return {
          id: sub,
          email: typeof payload.email === "string" ? payload.email : undefined,
        };
      } catch {
        return null;
      }
    },
    authServerUrls() {
      return [issuer];
    },
  };
}
