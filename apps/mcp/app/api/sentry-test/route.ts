// Throwaway-safe Sentry connectivity check. Visit
//   /api/sentry-test?token=<SENTRY_TEST_TOKEN>
// once after deploying to confirm events reach Sentry without waiting for a
// real error. Returns 404 unless SENTRY_TEST_TOKEN is set AND the token query
// param matches — so it's inert for the public.
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.SENTRY_TEST_TOKEN;
  const token = req.nextUrl.searchParams.get("token");

  if (!expected || token !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const eventId = Sentry.captureException(
    new Error(`Sentry test event (mcp) — ${new Date().toISOString()}`),
  );
  // Wait for the event to actually be sent before the response returns.
  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    eventId,
    note: eventId
      ? "Event sent — check Sentry Issues."
      : "No event id — is NEXT_PUBLIC_SENTRY_DSN set?",
  });
}
