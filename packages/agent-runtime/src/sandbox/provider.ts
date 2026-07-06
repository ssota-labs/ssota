import type { CreateSandboxSessionInput } from "@ssota/contracts";
import type {
  SandboxEnvironmentPort,
  SandboxHandle,
  SandboxSessionPort,
  SandboxSessionRecordPort,
  SkillPort,
} from "@ssota/core";
import { createSandboxHandle } from "./handle.js";
import { createLocalRawSandbox } from "./local-sandbox.js";
import { provisionSandboxSession } from "./provision.js";
import {
  createVercelSandbox,
  getVercelSandbox,
  shouldUseVercelSandbox,
} from "./vercel-client.js";

export interface SandboxProviderDeps {
  environmentPort: SandboxEnvironmentPort;
  sessionRecordPort: SandboxSessionRecordPort;
  githubToken?: string;
  resolveOrganizationId?: (teamspaceId: string) => Promise<string | null>;
  createSkillPort?: (scope: {
    organizationId: string;
    teamspaceId: string;
  }) => SkillPort;
}

export function createSandboxProvider(
  deps: SandboxProviderDeps,
): SandboxSessionPort {
  return {
    async provision(input: CreateSandboxSessionInput) {
      const environment = await deps.environmentPort.getById(
        input.sandboxEnvironmentId,
      );
      if (!environment) {
        throw new Error(
          `Sandbox environment not found: ${input.sandboxEnvironmentId}`,
        );
      }

      const sources = await deps.environmentPort.listSources(environment.id);
      let organizationId: string | undefined;
      let skillPort: SkillPort | undefined;
      if (input.agentDefinitionId && deps.resolveOrganizationId && deps.createSkillPort) {
        const orgId = await deps.resolveOrganizationId(environment.teamspaceId);
        if (orgId) {
          organizationId = orgId;
          skillPort = deps.createSkillPort({
            organizationId: orgId,
            teamspaceId: environment.teamspaceId,
          });
        }
      }
      const { sessionId } = await provisionSandboxSession({
        environment,
        sources,
        sessionRecordPort: deps.sessionRecordPort,
        ownerAgentRunId: input.ownerAgentRunId,
        ownerTaskId: input.ownerTaskId,
        githubToken: deps.githubToken,
        agentDefinitionId: input.agentDefinitionId,
        organizationId,
        skillPort,
      });

      const session = await deps.sessionRecordPort.getById(sessionId);
      if (!session) {
        throw new Error(`Sandbox session record missing after provision`);
      }
      return session;
    },

    async attach(sessionId: string): Promise<SandboxHandle> {
      const session = await deps.sessionRecordPort.getById(sessionId);
      if (!session) {
        throw new Error(`Sandbox session not found: ${sessionId}`);
      }
      if (!session.vercelSandboxId) {
        throw new Error(
          `Sandbox session ${sessionId} has no Vercel sandbox id`,
        );
      }

      const environment = await deps.environmentPort.getById(
        session.sandboxEnvironmentId,
      );
      const workingDirectory = environment?.workingRoot ?? "/vercel/sandbox";
      const allowedRoots =
        session.allowedRoots.length > 0
          ? session.allowedRoots
          : [workingDirectory];

      const raw = await getVercelSandbox(session.vercelSandboxId);

      await deps.sessionRecordPort.updateRecord(sessionId, {
        status: "running",
      });

      return createSandboxHandle({
        sessionId,
        vercelSandboxId: session.vercelSandboxId,
        raw,
        workingDirectory,
        allowedRoots,
      });
    },

    async stop(sessionId: string): Promise<void> {
      const session = await deps.sessionRecordPort.getById(sessionId);
      if (!session?.vercelSandboxId) return;

      try {
        const handle = await this.attach(sessionId);
        await handle.stop();
      } catch {
        // best-effort teardown
      }

      await deps.sessionRecordPort.updateRecord(sessionId, {
        status: "stopped",
      });
    },
  };
}

/** Ephemeral one-shot sandbox for script tools (no DB session row). */
export async function runEphemeralSandbox<T>(
  fn: (handle: SandboxHandle) => Promise<T>,
  options?: {
    runtime?: string;
    timeoutMs?: number;
    workingDirectory?: string;
  },
): Promise<T> {
  const useVercel = shouldUseVercelSandbox();
  const raw = useVercel
    ? await createVercelSandbox({
        runtime: options?.runtime ?? "node24",
        timeoutMs: options?.timeoutMs ?? 120_000,
      })
    : createLocalRawSandbox();
  const vercelSandboxId = raw.sandboxId ?? "ephemeral";
  const workingDirectory = useVercel
    ? (options?.workingDirectory ?? "/vercel/sandbox")
    : "/tmp";
  const ephemeralRoots = useVercel
    ? [workingDirectory, "/tmp"]
    : ["/tmp"];
  const handle = createSandboxHandle({
    sessionId: "ephemeral",
    vercelSandboxId,
    raw,
    workingDirectory,
    allowedRoots: ephemeralRoots,
  });

  try {
    return await fn(handle);
  } finally {
    try {
      await handle.stop();
    } catch {
      // best-effort teardown
    }
  }
}
