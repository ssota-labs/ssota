export type ConnectorConnectScope = "user" | "org";

export function buildConnectorAuthorizeHref(params: {
  slug: string;
  teamspaceId: string;
  accountId: string;
  returnTo: string;
  scope?: ConnectorConnectScope;
}): string {
  const search = new URLSearchParams({
    connector: params.slug,
    accountId: params.accountId,
    teamspaceId: params.teamspaceId,
    returnTo: params.returnTo,
  });
  if (params.scope === "org") search.set("scope", "org");
  return `/api/connect/authorize?${search.toString()}`;
}
