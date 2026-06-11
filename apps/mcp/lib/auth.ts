import { createRemoteJWKSet, jwtVerify } from "jose";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

/** Supabase OAuth 2.1 authorization server issuer (RFC 8414). */
export function supabaseAuthIssuerUrl(url = supabaseUrl): string {
  return `${url.replace(/\/$/, "")}/auth/v1`;
}

const jwks = createRemoteJWKSet(
  new URL(`${supabaseAuthIssuerUrl()}/.well-known/jwks.json`),
);

export interface AuthUser {
  id: string;
  email?: string;
}

export async function verifyBearerToken(
  authorization: string | null,
): Promise<AuthUser | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: supabaseAuthIssuerUrl(),
    });
    const sub = payload.sub;
    if (!sub) return null;
    return {
      id: sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
