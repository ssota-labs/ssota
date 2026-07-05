/**
 * Low-level `@vercel/sandbox` client. Defensive `unknown` wrapping — same as
 * legacy session.ts / studio-sandbox.
 */
export type RawSandbox = {
  sandboxId?: string;
  runCommand: (opts: {
    cmd: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
  }) => Promise<{
    exitCode: number;
    stdout?: () => Promise<string>;
    stderr?: () => Promise<string>;
  }>;
  writeFile?: (path: string, body: string) => Promise<void>;
  readFile?: (path: string) => Promise<Uint8Array | string>;
  snapshot?: () => Promise<{ snapshotId?: string } | string>;
  stop: () => Promise<void>;
};

export interface VercelSandboxCreateOptions {
  runtime?: string;
  timeoutMs?: number;
  name?: string;
}

function getSandboxCredentials(): Record<string, string> {
  const { VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID } = process.env;
  if (VERCEL_TOKEN && VERCEL_TEAM_ID && VERCEL_PROJECT_ID) {
    return {
      token: VERCEL_TOKEN,
      teamId: VERCEL_TEAM_ID,
      projectId: VERCEL_PROJECT_ID,
    };
  }
  return {};
}

/** Explicit Vercel API credentials (local scripts / CI). */
export function hasVercelSandboxCredentials(): boolean {
  const { VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID } = process.env;
  return Boolean(VERCEL_TOKEN && VERCEL_TEAM_ID && VERCEL_PROJECT_ID);
}

/**
 * Use remote Vercel Sandbox when deployed on Vercel (OIDC) or when API creds are set.
 * Otherwise fall back to local subprocess execution (dev laptops).
 */
export function shouldUseVercelSandbox(): boolean {
  if (hasVercelSandboxCredentials()) return true;
  return process.env.VERCEL === "1";
}

async function loadSandboxSdk() {
  try {
    const { Sandbox } = await import("@vercel/sandbox");
    return Sandbox;
  } catch {
    throw new Error("@vercel/sandbox is not installed");
  }
}

export async function createVercelSandbox(
  options: VercelSandboxCreateOptions = {},
): Promise<RawSandbox> {
  const Sandbox = await loadSandboxSdk();
  const credentials = getSandboxCredentials();
  const createOpts: Record<string, unknown> = {
    ...credentials,
    runtime: options.runtime ?? "node24",
    timeout: options.timeoutMs ?? 120_000,
  };
  if (options.name) createOpts.name = options.name;
  return (await Sandbox.create(
    createOpts as Parameters<typeof Sandbox.create>[0],
  )) as unknown as RawSandbox;
}

export async function getVercelSandbox(sandboxId: string): Promise<RawSandbox> {
  const Sandbox = await loadSandboxSdk();
  return (await Sandbox.get({
    ...getSandboxCredentials(),
    sandboxId,
  })) as unknown as RawSandbox;
}
