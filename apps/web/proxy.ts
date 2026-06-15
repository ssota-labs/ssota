import { createServerClient } from "@supabase/ssr";
import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "@/lib/console/constants";
import { NextResponse, type NextRequest } from "next/server";

const defaultBase = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function legacyRedirect(request: NextRequest, targetPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = "";
  return NextResponse.redirect(url, 308);
}

function mapV27LegacyPath(pathname: string): string | null {
  const devMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/dev(?:\/(.*))?$/);
  if (devMatch) {
    const suffix = devMatch[3] ? `/${devMatch[3]}` : "";
    return `/${devMatch[1]}/${devMatch[2]}/product/dev${suffix}`;
  }

  const designMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/design(?:\/(.*))?$/);
  if (designMatch) {
    const suffix = designMatch[3] ? `/${designMatch[3]}` : "";
    return `/${designMatch[1]}/${designMatch[2]}/product/design${suffix}`;
  }

  const productUuidMatch = pathname.match(
    /^\/([^/]+)\/([^/]+)\/product\/([^/]+)(?:\/(.*))?$/,
  );
  if (productUuidMatch && UUID_RE.test(productUuidMatch[3]!)) {
    const suffix = productUuidMatch[4] ? `/${productUuidMatch[4]}` : "";
    return `/${productUuidMatch[1]}/${productUuidMatch[2]}/product/initiatives/${productUuidMatch[3]}${suffix}`;
  }

  return null;
}

function mapLegacyPath(pathname: string): string | null {
  const v27 = mapV27LegacyPath(pathname);
  if (v27) return v27;

  const projectScopedArchiveMatch = pathname.match(
    /^\/([^/]+)\/([^/]+)\/(workflow|graph|gates|log|impact)\/?$/,
  );
  if (projectScopedArchiveMatch) {
    const [, org, project, segment] = projectScopedArchiveMatch;
    if (segment === "workflow") {
      return `/${org}/${project}/workflow/map`;
    }
    return `/${org}/${project}/overview`;
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
    return `${defaultBase}/overview`;
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
