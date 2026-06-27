import { NextResponse, type NextRequest } from "next/server";

/** First URL segment after org that is a console route (not a teamspace slug). */
const CONSOLE_ROUTE_SEGMENTS = new Set([
  "p",
  "tasks",
  "chat",
  "c",
  "overview",
  "settings",
  "developer",
  "workflow",
  "research",
  "executive",
  "manager",
  "connectors",
  "schedules",
  "design",
  "graph",
  "n",
]);

const GLOBAL_PREFIXES = [
  "api",
  "app",
  "auth",
  "login",
  "oauth",
  "onboarding",
  "editor-lab",
  "editor-lab-blocknote",
  "labs",
  "settings",
  "emulate",
  "_next",
  "favicon.ico",
];

const DEFAULT_TEAMSPACE_SLUG = "ssota-dev";
const TEAMSPACE_COOKIE = "ssota-active-teamspace";

function isGlobalPath(pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? GLOBAL_PREFIXES.some((p) => segment === p || segment.startsWith(p)) : false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isGlobalPath(pathname)) {
    return NextResponse.next();
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return NextResponse.next();
  }

  const [orgSlug, second, ...rest] = parts;

  // Org index — rewrite to default teamspace overview route.
  if (parts.length === 1) {
    const teamspaceSlug =
      request.cookies.get(TEAMSPACE_COOKIE)?.value ?? DEFAULT_TEAMSPACE_SLUG;
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/${teamspaceSlug}/overview`;
    return NextResponse.rewrite(url);
  }

  if (!second) {
    return NextResponse.next();
  }

  const isFlatConsoleRoute = CONSOLE_ROUTE_SEGMENTS.has(second);

  // Legacy /{org}/{teamspace}/... → redirect to /{org}/...
  if (!isFlatConsoleRoute && parts.length >= 2) {
    const suffix = rest.length ? `/${rest.join("/")}` : "";
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}${suffix}`;
    return NextResponse.redirect(url, 308);
  }

  // Flat /{org}/{route}/... → rewrite to /{org}/{teamspace}/{route}/... for existing app routes.
  if (isFlatConsoleRoute) {
    const teamspaceSlug =
      request.cookies.get(TEAMSPACE_COOKIE)?.value ?? DEFAULT_TEAMSPACE_SLUG;
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/${teamspaceSlug}/${second}${rest.length ? `/${rest.join("/")}` : ""}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
