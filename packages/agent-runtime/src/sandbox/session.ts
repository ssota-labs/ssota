/**
 * Thin session wrapper over `@vercel/sandbox`. The agent runs OUTSIDE the
 * sandbox and drives it through these methods (the open-agents principle).
 * `@vercel/sandbox` is an optional dependency and its typed surface is
 * unstable (v0.0.17), so calls are made defensively through `unknown` — the
 * same approach `@ssota/studio-sandbox` uses.
 */
export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface SandboxSession {
  /** Sandbox id — store it to re-attach across workflow step boundaries. */
  readonly sandboxId: string;
  readonly workingDirectory: string;
  exec(cmd: string, args?: string[]): Promise<ExecResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  /** Snapshot for hibernation/fast resume; returns a snapshot id if supported. */
  snapshot(): Promise<string | null>;
  stop(): Promise<void>;
}

type RawSandbox = {
  sandboxId?: string;
  runCommand: (opts: {
    cmd: string;
    args?: string[];
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

function wrap(
  raw: RawSandbox,
  sandboxId: string,
  workingDirectory: string,
): SandboxSession {
  return {
    sandboxId,
    workingDirectory,
    async exec(cmd, args = []) {
      const result = await raw.runCommand({ cmd, args });
      const stdout = result.stdout ? await result.stdout() : "";
      const stderr = result.stderr ? await result.stderr() : "";
      return { exitCode: result.exitCode, stdout, stderr };
    },
    async writeFile(path, content) {
      if (!raw.writeFile) throw new Error("Sandbox writeFile API unavailable");
      await raw.writeFile(path, content);
    },
    async readFile(path) {
      if (!raw.readFile) throw new Error("Sandbox readFile API unavailable");
      const bytes = await raw.readFile(path);
      return typeof bytes === "string"
        ? bytes
        : new TextDecoder().decode(bytes);
    },
    async snapshot() {
      if (!raw.snapshot) return null;
      const snap = await raw.snapshot();
      return typeof snap === "string" ? snap : (snap.snapshotId ?? null);
    },
    async stop() {
      await raw.stop();
    },
  };
}

export interface CreateSandboxSessionOptions {
  runtime?: string;
  timeoutMs?: number;
  workingDirectory?: string;
}

/**
 * Explicit credentials for local/dev. On Vercel, OIDC is automatic and these
 * are unnecessary (the SDK falls back to `VERCEL_OIDC_TOKEN`).
 */
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

/**
 * Provision a fresh sandbox. Throws if `@vercel/sandbox` is not installed or
 * credentials are missing (OIDC on Vercel, or VERCEL_TOKEN/TEAM/PROJECT for
 * local dev).
 */
export async function createSandboxSession(
  options: CreateSandboxSessionOptions = {},
): Promise<SandboxSession> {
  let Sandbox: typeof import("@vercel/sandbox").Sandbox;
  try {
    ({ Sandbox } = await import("@vercel/sandbox"));
  } catch {
    throw new Error("@vercel/sandbox is not installed");
  }

  const raw = (await Sandbox.create({
    ...getSandboxCredentials(),
    runtime: (options.runtime ?? "node24") as "node24",
    timeout: options.timeoutMs ?? 120_000,
  })) as unknown as RawSandbox;

  return wrap(
    raw,
    raw.sandboxId ?? "",
    options.workingDirectory ?? "/vercel/sandbox",
  );
}

/**
 * Re-attach to an existing sandbox by id (Sandbox.get). Used inside a durable
 * tool step to reconnect to the sandbox provisioned earlier in the run — a live
 * sandbox session cannot cross workflow step boundaries, but its id can.
 */
export async function attachSandboxSession(
  sandboxId: string,
  options: Pick<CreateSandboxSessionOptions, "workingDirectory"> = {},
): Promise<SandboxSession> {
  let Sandbox: typeof import("@vercel/sandbox").Sandbox;
  try {
    ({ Sandbox } = await import("@vercel/sandbox"));
  } catch {
    throw new Error("@vercel/sandbox is not installed");
  }

  const raw = (await Sandbox.get({
    ...getSandboxCredentials(),
    sandboxId,
  })) as unknown as RawSandbox;

  return wrap(
    raw,
    raw.sandboxId ?? sandboxId,
    options.workingDirectory ?? "/vercel/sandbox",
  );
}
