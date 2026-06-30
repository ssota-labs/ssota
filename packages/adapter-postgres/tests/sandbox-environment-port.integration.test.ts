import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import {
  createConsolePort,
  createDb,
  createSandboxEnvironmentPort,
  createSandboxSessionRecordPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";

let skip = false;

describe("sandbox environment port integration", () => {
  let teamspaceId: string;
  let envPort: ReturnType<typeof createSandboxEnvironmentPort>;
  let sessionPort: ReturnType<typeof createSandboxSessionRecordPort>;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getTeamspaceBySlug(
        org.id,
        DEFAULT_TEAMSPACE_SLUG,
      );
      if (!project) {
        skip = true;
        return;
      }
      teamspaceId = project.id;
      const scope = { teamspaceId };
      envPort = createSandboxEnvironmentPort(dbBundle.db, scope);
      sessionPort = createSandboxSessionRecordPort(dbBundle.db, scope);
    } catch {
      skip = true;
    }
  });

  it("upserts environment with sources and creates session record", async () => {
    if (skip) return;

    const envId = randomUUID();
    const env = await envPort.upsertEnvironment({
      id: envId,
      key: `sandbox.test.${randomUUID().slice(0, 8)}`,
      name: "Test Sandbox",
      description: "Integration test fixture",
      runtime: "node24",
      workingRoot: "/vercel/sandbox",
      sources: [
        {
          key: "app",
          url: "https://github.com/example/app",
          path: "/vercel/sandbox/app",
          primary: true,
        },
      ],
    });

    expect(env.id).toBe(envId);

    const sources = await envPort.listSources(envId);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.key).toBe("app");

    const session = await sessionPort.createRecord({
      teamspaceId,
      sandboxEnvironmentId: envId,
      allowedRoots: ["/vercel/sandbox", "/vercel/sandbox/app"],
    });
    expect(session.status).toBe("provisioning");

    const updated = await sessionPort.updateRecord(session.id, {
      vercelSandboxId: "sb-test-123",
      status: "ready",
      setupStatus: "ready",
    });
    expect(updated?.vercelSandboxId).toBe("sb-test-123");
    expect(updated?.status).toBe("ready");

    const snapshot = await sessionPort.createSnapshotRecord({
      teamspaceId,
      sandboxEnvironmentId: envId,
      vercelSnapshotId: "snap-1",
      kind: "project",
      label: "post-setup",
    });
    expect(snapshot.id).toBeTruthy();

    const snapshots = await envPort.listSnapshots(envId);
    expect(snapshots.some((s) => s.id === snapshot.id)).toBe(true);

    await envPort.deleteById(envId);
    expect(await envPort.getById(envId)).toBeNull();
  });
});
