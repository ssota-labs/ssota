import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/provider";

/** When true, only `/`, `/home`, and beta signup API are public; other routes redirect home. */
function isMarketingOnly(): boolean {
  return process.env.MARKETING_ONLY === "true";
}

const MARKETING_ALLOWED_PREFIXES = [
  "/api/beta-signup",
  "/_next",
  "/favicon.ico",
];

function marketingGateResponse(request: NextRequest): NextResponse | null {
  if (!isMarketingOnly()) {
    return null;
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname === "/home") {
    return null;
  }

  if (
    MARKETING_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/home";
  url.search = "";
  return NextResponse.redirect(url);
}

/** First URL segment after org that is a console route (not a teamspace slug). */
const CONSOLE_ROUTE_SEGMENTS = new Set([
  "p",
  "tasks",
  "agents",
  "skills",
  "chat",
  "c",
  "overview",
  "settings",
  "developer",
  "workflow",
  "research",
  "executive",
  "manager",
  "connections",
  "channels",
  "schedules",
  "sandbox",
  "templates",
  "tools",
  "workers",
  "subagents",
  "design",
  "graph",
  "work-cycle",
  "n",
]);

const GLOBAL_PREFIXES = [
  "api",
  "app",
  "auth",
  "home",
  "login",
  "oauth",
  "onboarding",
  "editor-lab",
  "editor-lab-blocknote",
  "labs",
  "settings",
  "emulate",
  ".well-known",
  "_next",
  "favicon.ico",
];

const DEFAULT_TEAMSPACE_SLUG = "ssota-dev";
const TEAMSPACE_COOKIE = "ssota-active-teamspace";

function isGlobalPath(pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? GLOBAL_PREFIXES.some((p) => segment === p || segment.startsWith(p)) : false;
}

/** Org-scoped flat URL routing (legacy teamspace segment redirect + internal rewrite). */
function orgUrlResponse(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (isGlobalPath(pathname)) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const [orgSlug, second, ...rest] = parts;

  if (parts.length === 1) {
    const teamspaceSlug =
      request.cookies.get(TEAMSPACE_COOKIE)?.value ?? DEFAULT_TEAMSPACE_SLUG;
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/${teamspaceSlug}/overview`;
    return NextResponse.rewrite(url);
  }

  if (!second) {
    return null;
  }

  if (second === "connectors") {
    const suffix = rest.length ? `/${rest.join("/")}` : "";
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/connections${suffix}`;
    return NextResponse.redirect(url, 308);
  }

  if (second === "templates") {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding/template";
    return NextResponse.redirect(url, 308);
  }

  if (second === "tools") {
    const suffix = rest.length ? `/${rest.join("/")}` : "";
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/workers${suffix}`;
    return NextResponse.redirect(url, 308);
  }

  const isFlatConsoleRoute = CONSOLE_ROUTE_SEGMENTS.has(second);

  if (!isFlatConsoleRoute && parts.length >= 2) {
    const suffix = rest.length ? `/${rest.join("/")}` : "";
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}${suffix}`;
    return NextResponse.redirect(url, 308);
  }

  if (isFlatConsoleRoute) {
    const teamspaceSlug =
      request.cookies.get(TEAMSPACE_COOKIE)?.value ?? DEFAULT_TEAMSPACE_SLUG;
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/${teamspaceSlug}/${second}${rest.length ? `/${rest.join("/")}` : ""}`;
    return NextResponse.rewrite(url);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const marketingResponse = marketingGateResponse(request);
  if (marketingResponse) {
    return marketingResponse;
  }

  const orgResponse = orgUrlResponse(request);
  if (orgResponse?.status === 308) {
    return orgResponse;
  }

  const sessionResponse = await updateSession(request);

  if (orgResponse) {
    const requestHeaders = new Headers(request.headers);
    const pathname = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    requestHeaders.set("x-pathname", pathname);
    const rewriteTarget = orgResponse.headers.get("x-middleware-rewrite");
    if (rewriteTarget) {
      return NextResponse.rewrite(new URL(rewriteTarget), {
        request: { headers: requestHeaders },
      });
    }
    return orgResponse;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!api/connect|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
