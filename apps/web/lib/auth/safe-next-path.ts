/**
 * Validates post-login redirect targets (open-redirect safe).
 * Currently limited to Supabase OAuth MCP consent return paths.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return null;
  }

  const url = new URL(next, "http://localhost");
  if (url.pathname !== "/oauth/consent") return null;
  if (!url.searchParams.get("authorization_id")?.trim()) return null;

  return `${url.pathname}${url.search}`;
}
