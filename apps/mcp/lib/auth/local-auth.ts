import type { AuthUser, McpAuthProvider } from "./types";

const DEFAULT_LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_LOCAL_USER_EMAIL = "dev@localhost";

/**
 * OSS default MCP auth: a single fixed user. If `MCP_LOCAL_TOKEN` is set, the
 * bearer token must match it (a shared secret for the self-hosted MCP); if
 * unset, any bearer token is accepted (local development). There is no external
 * authorization server, so the protected-resource metadata advertises none.
 */
export function createLocalMcpAuthProvider(): McpAuthProvider {
  const user: AuthUser = {
    id: process.env.LOCAL_AUTH_USER_ID ?? DEFAULT_LOCAL_USER_ID,
    email: process.env.LOCAL_AUTH_USER_EMAIL ?? DEFAULT_LOCAL_USER_EMAIL,
  };
  const sharedToken = process.env.MCP_LOCAL_TOKEN;

  return {
    async verifyBearerToken(authorization: string | null) {
      if (!authorization?.startsWith("Bearer ")) return null;
      const token = authorization.slice("Bearer ".length);
      if (sharedToken && token !== sharedToken) return null;
      return user;
    },
    authServerUrls() {
      return [];
    },
  };
}
