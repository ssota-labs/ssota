import { createServerClient } from "@supabase/ssr";
import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "@/lib/console/constants";
import { NextResponse, type NextRequest } from "next/server";

const defaultBase = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

function legacyRedirect(request: NextRequest, targetPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = "";
  return NextResponse.redirect(url, 308);
}

function mapLegacyPath(pathname: string): string | null {
  const projectScopedArchiveMatch = pathname.match(
    /^\/([^/]+)\/([^/]+)\/(workflow|graph|gates|log|impact)(?:\/.*)?$/,
  );
  if (projectScopedArchiveMatch) {
    return `/${projectScopedArchiveMatch[1]}/${projectScopedArchiveMatch[2]}`;
  }

  if (
    pathname === "/context-graph" ||
    pathname.startsWith("/context-graph/") ||
    pathname === "/gates" ||
    pathname === "/log" ||
    pathname === "/workflows" ||
    pathname === "/impact" ||
    pathname === "/catalog" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/graph/")
  ) {
    return defaultBase;
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
