// MCP auth seam. Delegates to the configured provider (local for OSS, Supabase
// for Enterprise). Re-exported here so existing `@/lib/auth` imports keep
// working; see lib/auth/ for the providers.
export { verifyBearerToken, authServerUrls, type AuthUser } from "./auth/provider";
