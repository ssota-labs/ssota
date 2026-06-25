export type ProviderApiName = "slack" | "github" | "linear";

const DEFAULT_EMULATE_URLS: Record<ProviderApiName, string> = {
  slack: "http://localhost:4003",
  github: "http://localhost:4001",
  linear: "http://localhost:4012",
};

const EMULATE_URL_ENV: Record<ProviderApiName, string> = {
  slack: "EMULATE_SLACK_URL",
  github: "EMULATE_GITHUB_URL",
  linear: "EMULATE_LINEAR_URL",
};

/** True when agent-runtime should call local emulate URLs instead of production APIs. */
export function isEmulateEnabled(): boolean {
  return process.env.EMULATE_ENABLED === "1";
}

/**
 * Resolve the API origin for a provider. When emulate is enabled, returns the
 * local emulator base URL (env override or documented default port).
 */
export function resolveProviderApiOrigin(provider: ProviderApiName): string {
  const envKey = EMULATE_URL_ENV[provider];
  const fromEnv = process.env[envKey]?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_EMULATE_URLS[provider];
}

/**
 * When `EMULATE_ENABLED=1`, replace the production API origin with emulate.
 * Otherwise returns `productionUrl` unchanged.
 */
export function resolveProviderApiUrl(
  provider: ProviderApiName,
  productionUrl: string,
): string {
  if (!isEmulateEnabled()) return productionUrl;
  const production = new URL(productionUrl);
  const emulateOrigin = resolveProviderApiOrigin(provider);
  return `${emulateOrigin}${production.pathname}${production.search}`;
}

/** Slack OAuth authorize URL on the local emulate instance. */
export function resolveEmulateSlackOAuthAuthorizeUrl(
  callbackUrl: string,
  scopes: string[] = [],
): string | null {
  if (process.env.EMULATE_OAUTH !== "1") return null;
  const base = resolveProviderApiOrigin("slack");
  const url = new URL(`${base}/oauth/v2/authorize`);
  url.searchParams.set(
    "client_id",
    process.env.EMULATE_SLACK_CLIENT_ID ?? "12345.ssota-dev",
  );
  url.searchParams.set("redirect_uri", callbackUrl);
  if (scopes.length > 0) {
    url.searchParams.set("scope", scopes.join(","));
  }
  return url.toString();
}
