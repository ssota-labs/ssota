import type { NextRequest, NextResponse } from "next/server";

/** The minimal user shape SSOTA depends on. Consumers use `id` and `email`. */
export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Pluggable authentication. The selection of implementation is the open-core
 * boundary:
 *
 *  - `local`    (OSS): single-user / dev auth, no external service.
 *  - `supabase` (Enterprise): Supabase Auth (cookies, OAuth, multi-user).
 */
export interface AuthProvider {
  /** The authenticated user for the current request, or null. */
  getCurrentUser(): Promise<AuthUser | null>;
  /**
   * Proxy/middleware hook: refresh the session and return the response. Always
   * sets the `x-pathname` header the app relies on.
   */
  updateSession(request: NextRequest): Promise<NextResponse>;
}
