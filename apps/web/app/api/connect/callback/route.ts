import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Legacy connect callback. Composio now owns the OAuth callback and returns the
 * user straight to the `returnTo` we pass as the connection `callbackUrl`, so
 * this route is normally never hit. Kept as a safety net: bounce any stray hit
 * back to `returnTo` (or home). No DB writes — connection state lives in
 * Composio and is read live by the Connections page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  return NextResponse.redirect(new URL(returnTo, url.origin));
}
