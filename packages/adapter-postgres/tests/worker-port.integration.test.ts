import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import { textToBlockNoteContent } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import {
  createConsolePort,
  createDb,
  createWorkerPort,
  createAgentDefinitionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";

let skip = false;

describe("worker port integration", () => {
  let teamspaceId: string;
  let port: ReturnType<typeof createWorkerPort>;
  let agentDefinitionId: string;

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
      port = createWorkerPort(dbBundle.db, { teamspaceId });
      const agentPort = createAgentDefinitionPort(dbBundle.db, { teamspaceId });
      agentDefinitionId = BUILTIN_AGENT_IDS.main;
      await agentPort.upsertDefinition({
        id: agentDefinitionId,
        name: "Main agent fixture",
        description: "Worker port integration fixture",
        instructions: textToBlockNoteContent("Fixture."),
        toolBundles: ["workers"],
        nodeScopes: [],
        runPolicy: {},
      });
    } catch {
      skip = true;
    }
  });

  it("creates, lists, updates, and deletes a tool worker", async () => {
    if (skip) return;

    const key = `test.echo.${randomUUID().slice(0, 8)}`;
    const created = await port.createWorker({
      key,
      name: "Echo test",
      description: "Integration fixture",
      kind: "tool",
      script: "export default async (input) => input",
      inputSchema: {},
    });

    expect(created.key).toBe(key);
    expect(created.kind).toBe("tool");

    const listed = await port.listWorkers("tool");
    expect(listed.some((w) => w.id === created.id)).toBe(true);

    const byKey = await port.getByKey(key);
    expect(byKey?.id).toBe(created.id);

    const updated = await port.updateWorker(created.id, {
      description: "Updated",
    });
    expect(updated.version).toBe(created.version + 1);
    expect(updated.description).toBe("Updated");

    await port.deleteWorker(created.id);
    expect(await port.getById(created.id)).toBeNull();
  });

  it("derives worker key from name when key is omitted", async () => {
    if (skip) return;

    const created = await port.createWorker({
      name: "Frontend Worker",
      description: "Auto key from title",
      kind: "tool",
      script: "export default async () => ({})",
      inputSchema: {},
    });
    expect(created.key).toBe("frontend-worker");
    await port.deleteWorker(created.id);
  });

  it("rejects duplicate keys in the same teamspace", async () => {
    if (skip) return;

    const key = `test.dup.${randomUUID().slice(0, 8)}`;
    const worker = await port.createWorker({
      key,
      name: "Dup test",
      kind: "tool",
      script: "export default async () => ({})",
      inputSchema: {},
    });

    await expect(
      port.createWorker({
        key,
        name: "Dup again",
        kind: "tool",
        script: "export default async () => ({})",
        inputSchema: {},
      }),
    ).rejects.toThrow();

    await port.deleteWorker(worker.id);
  });

  it("only links tool-kind workers to agent definitions", async () => {
    if (skip) return;

    const toolKey = `test.tool.${randomUUID().slice(0, 8)}`;
    const syncKey = `test.sync.${randomUUID().slice(0, 8)}`;
    const tool = await port.createWorker({
      key: toolKey,
      name: "Tool link",
      kind: "tool",
      script: "export default async () => ({})",
      inputSchema: {},
    });
    const sync = await port.createWorker({
      key: syncKey,
      name: "Sync link",
      kind: "sync",
      script: "export default async () => ({})",
      inputSchema: {},
      kindConfig: {
        cronExpression: "0 * * * *",
        timezone: "UTC",
        enabled: true,
      },
    });

    const agentId = agentDefinitionId;
    await port.setAgentWorkers(agentId, [tool.id, sync.id]);

    const linkedIds = await port.listLinkedWorkerIds(agentId);
    expect(linkedIds).toContain(tool.id);
    expect(linkedIds).toContain(sync.id);

    const forAgent = await port.listForAgentDefinition(agentId);
    expect(forAgent.map((w) => w.id)).toEqual([tool.id]);

    await port.deleteWorker(tool.id);
    await port.deleteWorker(sync.id);
  });
});
