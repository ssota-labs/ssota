import type {
  CreateSandboxSessionInput,
  SandboxSession,
  SandboxSnapshotKind,
} from "@ssota/contracts";

/** Result of a shell command inside a sandbox handle. */
export interface SandboxExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  handle?: string;
}

/**
 * Live sandbox handle — re-hydrated per WDK step from `sandboxSessionId`.
 * Agent runs outside the VM; this is the brokered control surface.
 */
export interface SandboxHandle {
  readonly sessionId: string;
  readonly vercelSandboxId: string;
  readonly workingDirectory: string;
  readonly allowedRoots: readonly string[];
  exec(
    cmd: string,
    args?: string[],
    options?: { cwd?: string; timeoutMs?: number; env?: Record<string, string> },
  ): Promise<SandboxExecResult>;
  readFile(path: string, options?: { offset?: number; limit?: number }): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  snapshot(): Promise<string | null>;
  stop(): Promise<void>;
}

/** DB-backed session record port (persistence layer). */
export interface SandboxSessionRecordPort {
  createRecord(
    input: CreateSandboxSessionInput & {
      teamspaceId: string;
      allowedRoots?: string[];
    },
  ): Promise<SandboxSession>;
  getById(sessionId: string): Promise<SandboxSession | null>;
  updateRecord(
    sessionId: string,
    patch: Partial<
      Pick<
        SandboxSession,
        | "vercelSandboxId"
        | "sandboxName"
        | "status"
        | "currentSnapshotId"
        | "portUrls"
        | "setupStatus"
        | "allowedRoots"
        | "lastActivityAt"
      >
    >,
  ): Promise<SandboxSession | null>;
  createSnapshotRecord(input: {
    teamspaceId: string;
    sandboxEnvironmentId: string;
    vercelSnapshotId: string | null;
    kind: SandboxSnapshotKind;
    label: string;
    sourceRevisions?: Record<string, string>;
    createdByAgentRunId?: string | null;
  }): Promise<{ id: string }>;
}

/**
 * Runtime sandbox session port — provision, attach, stop.
 * Implemented by agent-runtime SandboxProvider (PR C).
 */
export interface SandboxSessionPort {
  provision(input: CreateSandboxSessionInput): Promise<SandboxSession>;
  attach(sessionId: string): Promise<SandboxHandle>;
  stop(sessionId: string): Promise<void>;
}
