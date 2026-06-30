import type { SandboxEnvironment, SandboxSource } from "@ssota/contracts";
import type { SandboxSessionRecordPort } from "@ssota/core";
import { checkoutSandboxSources, runSetupScript } from "./broker.js";
import { buildAllowedRoots } from "./path-policy.js";
import { createSandboxHandle } from "./handle.js";
import { createVercelSandbox } from "./vercel-client.js";

export async function provisionSandboxSession(input: {
  environment: SandboxEnvironment;
  sources: readonly SandboxSource[];
  sessionRecordPort: SandboxSessionRecordPort;
  ownerAgentRunId?: string | null;
  ownerTaskId?: string | null;
  githubToken?: string;
}): Promise<{ sessionId: string; vercelSandboxId: string }> {
  const { environment, sources, sessionRecordPort } = input;
  const allowedRoots = buildAllowedRoots(
    environment.workingRoot,
    sources.map((source) => source.path),
  );

  const session = await sessionRecordPort.createRecord({
    sandboxEnvironmentId: environment.id,
    teamspaceId: environment.teamspaceId,
    ownerAgentRunId: input.ownerAgentRunId ?? null,
    ownerTaskId: input.ownerTaskId ?? null,
    allowedRoots,
  });

  try {
    const raw = await createVercelSandbox({
      runtime: environment.runtime,
      timeoutMs: environment.persistencePolicy.idleTimeoutMs ?? 120_000,
      name: `ssota-${environment.key}-${session.id.slice(0, 8)}`,
    });

    const vercelSandboxId = raw.sandboxId ?? "";
    await input.sessionRecordPort.updateRecord(session.id, {
      vercelSandboxId,
      status: "provisioning",
      setupStatus: "cloning",
    });

    const handle = createSandboxHandle({
      sessionId: session.id,
      vercelSandboxId,
      raw,
      workingDirectory: environment.workingRoot,
      allowedRoots,
    });

    if (input.sources.length > 0) {
      await checkoutSandboxSources(handle, input.sources, {
        githubToken: input.githubToken,
      });
    }

    await input.sessionRecordPort.updateRecord(session.id, {
      setupStatus: "installing",
    });

    await runSetupScript(
      handle,
      environment.setupScript,
      environment.workingRoot,
    );

    await input.sessionRecordPort.updateRecord(session.id, {
      status: "ready",
      setupStatus: "ready",
      allowedRoots,
    });

    if (environment.persistencePolicy.snapshotOnSetup) {
      const snapId = await handle.snapshot();
      if (snapId) {
        await input.sessionRecordPort.createSnapshotRecord({
          teamspaceId: environment.teamspaceId,
          sandboxEnvironmentId: environment.id,
          vercelSnapshotId: snapId,
          kind: "project",
          label: `setup-${new Date().toISOString()}`,
        });
      }
    }

    return { sessionId: session.id, vercelSandboxId };
  } catch (error) {
    await input.sessionRecordPort.updateRecord(session.id, {
      status: "failed",
      setupStatus: "failed",
    });
    throw error;
  }
}
