/**
 * Validates post-login redirect targets (open-redirect safe).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return null;
  }

  const url = new URL(next, "http://localhost");
  const path = `${url.pathname}${url.search}`;

  if (url.pathname === "/oauth/consent") {
    if (!url.searchParams.get("authorization_id")?.trim()) return null;
    return path;
  }

  if (url.pathname === "/" || url.pathname.startsWith("/onboarding/")) {
    return path;
  }

  // Console routes: /{orgSlug}/{teamspaceSlug}/...
  if (/^\/[^/]+\/[^/]+(\/.*)?$/.test(url.pathname)) {
    return path;
  }

  return null;
}
