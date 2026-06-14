import { createServerClient } from "@supabase/ssr";
import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "@/lib/console/constants";
import { NextResponse, type NextRequest } from "next/server";

const defaultBase = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

function legacyRedirect(request: NextRequest, targetPath: string) {
  const url = request.nextUrl.clone();
  const queryIndex = targetPath.indexOf("?");
  url.pathname = queryIndex === -1 ? targetPath : targetPath.slice(0, queryIndex);
  url.search = queryIndex === -1 ? "" : targetPath.slice(queryIndex);
  return NextResponse.redirect(url, 308);
}

function mapLegacyPath(pathname: string): string | null {
  if (pathname === "/context-graph" || pathname === "/context-graph/") {
    return `${defaultBase}/graph`;
  }
  if (pathname.startsWith("/context-graph/")) {
    const rest = pathname.slice("/context-graph/".length);
    if (rest === "instructions") {
      return `${defaultBase}/workflow`;
    }
    const segments = rest.split("/");
    if (segments[0] === "nodes" && segments[1]) {
      const slug = segments[1].toLowerCase();
      return `${defaultBase}/graph/nodes?table=${encodeURIComponent(slug)}`;
    }
    if (segments[0] === "edges" && segments[1]) {
      const slug = segments[1].toLowerCase();
      return `${defaultBase}/graph/edges?table=${encodeURIComponent(slug)}`;
    }
    if (segments[0] === "actions" && segments[1]) {
      segments[1] = segments[1].toLowerCase();
    }
    return `${defaultBase}/graph/${segments.join("/")}`;
  }
  if (pathname === "/gates") return `${defaultBase}/workflow?tab=reviews`;
  if (pathname === "/log") return `${defaultBase}/workflow?tab=runs`;
  if (pathname === "/workflows") return `${defaultBase}/workflow`;
  if (pathname === "/impact") return defaultBase;
  if (pathname === "/catalog") return `${defaultBase}/graph`;
  if (pathname.startsWith("/studio")) {
    return `${defaultBase}/graph/nodes`;
  }

  const labelNodeMatch = pathname.match(
    /^\/graph\/nodes\/([A-Za-z][a-zA-Z0-9_-]*)$/,
  );
  if (labelNodeMatch) {
    return `${defaultBase}/graph/nodes?table=${encodeURIComponent(labelNodeMatch[1]!.toLowerCase())}`;
  }

  const labelEdgeMatch = pathname.match(
    /^\/graph\/edges\/([A-Za-z][a-zA-Z0-9_-]*)$/,
  );
  if (labelEdgeMatch) {
    return `${defaultBase}/graph/edges?table=${encodeURIComponent(labelEdgeMatch[1]!.toLowerCase())}`;
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const legacyTarget = mapLegacyPath(request.nextUrl.pathname);
  if (legacyTarget) {
    return legacyRedirect(request, legacyTarget);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof supabaseResponse.cookies.set>[2];
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
