import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createSchedulePort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import {
  createScheduleForMcp,
  listSchedulesForMcp,
} from "./schedule-services";

// DB-backed (schedules table). Skips gracefully without DATABASE_URL / seeded org.
let skip = false;

describe("schedule-services (DB-backed)", () => {
  let db: ReturnType<typeof createDb>["db"];
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let teamspaceId: string;
  const createdScheduleIds: string[] = [];

  beforeAll(async () => {
    try {
      const bundle = createDb();
      db = bundle.db;
      client = bundle.client;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) return void (skip = true);
      const project = await consolePort.getTeamspaceBySlug(
        org.id,
        DEFAULT_TEAMSPACE_SLUG,
      );
      if (!project) return void (skip = true);
      teamspaceId = project.id;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    if (!skip && teamspaceId) {
      const port = createSchedulePort(db, { teamspaceId });
      for (const id of createdScheduleIds) await port.delete(id).catch(() => {});
    }
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("creates a schedule against an existing agent, then lists it", async () => {
    const created = await createScheduleForMcp(teamspaceId, {
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      cronExpression: "0 9 * * *",
    });
    createdScheduleIds.push(created.id);
    expect(created.cronExpression).toBe("0 9 * * *");
    expect(created.timezone).toBe("Asia/Seoul");

    const list = await listSchedulesForMcp(teamspaceId);
    expect(list.some((s) => s.id === created.id)).toBe(true);
  });

  it("rejects an invalid cron expression", async () => {
    await expect(
      createScheduleForMcp(teamspaceId, {
        agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
        cronExpression: "not a cron",
      }),
    ).rejects.toThrow(/Invalid cronExpression/);
  });

  it("rejects a schedule against an unknown agent", async () => {
    await expect(
      createScheduleForMcp(teamspaceId, {
        agentDefinitionId: "00000000-0000-4000-8000-0000000000ff",
        cronExpression: "0 9 * * *",
      }),
    ).rejects.toThrow(/Unknown agentDefinitionId/);
  });
});
