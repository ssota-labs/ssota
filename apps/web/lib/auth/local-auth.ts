import { NextResponse, type NextRequest } from "next/server";
import type { AuthProvider, AuthUser } from "./types";

/** Default single-user identity for self-hosted local mode. */
const DEFAULT_LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_LOCAL_USER_EMAIL = "dev@localhost";

/**
 * OSS default auth provider. Runs as a single, always-signed-in user — no
 * external auth service, no cookies, no login flow. The identity is fixed per
 * deployment via `LOCAL_AUTH_USER_ID` / `LOCAL_AUTH_USER_EMAIL` so it can match
 * a seeded row. Intended for self-hosting and local development; swap in a real
 * provider (e.g. Auth.js) for multi-user setups.
 */
export function createLocalAuthProvider(): AuthProvider {
  const user: AuthUser = {
    id: process.env.LOCAL_AUTH_USER_ID ?? DEFAULT_LOCAL_USER_ID,
    email: process.env.LOCAL_AUTH_USER_EMAIL ?? DEFAULT_LOCAL_USER_EMAIL,
  };

  return {
    async getCurrentUser() {
      return user;
    },
    async updateSession(request: NextRequest) {
      // No session to refresh — just set the x-pathname header the app reads.
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(
        "x-pathname",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.next({ request: { headers: requestHeaders } });
    },
  };
}
