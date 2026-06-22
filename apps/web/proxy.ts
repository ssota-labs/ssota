import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/provider";

export async function proxy(request: NextRequest) {
  // Session refresh + x-pathname header, delegated to the configured auth
  // provider (no-op refresh for local, Supabase cookie rotation for Enterprise).
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclude the public Vercel Connect entry/return routes: they are
    // unauthenticated top-level redirects keyed on the `accountId` query (not
    // the user session). Running the session-refresh proxy on them rotates the
    // auth cookie mid-redirect and can drop it, bouncing the user to /login.
    "/((?!api/connect|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
