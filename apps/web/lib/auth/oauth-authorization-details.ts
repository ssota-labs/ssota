export type OAuthAuthorizationDetails = {
  clientName: string;
  clientLogoUri: string | null;
  userEmail: string | null;
  scopes: string[];
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readScopes(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

export function parseOAuthAuthorizationDetails(
  data: Record<string, unknown>,
): OAuthAuthorizationDetails {
  const client =
    data.client && typeof data.client === "object"
      ? (data.client as Record<string, unknown>)
      : null;
  const user =
    data.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : null;

  return {
    clientName: readString(client?.name) ?? "MCP client",
    clientLogoUri: readString(client?.logo_uri),
    userEmail: readString(user?.email),
    scopes: readScopes(data.scope),
  };
}
