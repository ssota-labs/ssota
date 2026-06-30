import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createAgentDefinitionPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import {
  getAgentForMcp,
  getAgentInstructionForMcp,
  listAgentsForMcp,
} from "./agent-services";

let skip = false;

describe("agent-services", () => {
  let db: ReturnType<typeof createDb>["db"];
  let teamspaceId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      db = dbBundle.db;
      client = dbBundle.client;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      teamspaceId = project.id;
      await createAgentDefinitionPort(db, { teamspaceId }).listDefinitions();
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("lists agent definitions without bodies (incl. code built-ins)", async () => {
    const result = await listAgentsForMcp(db, teamspaceId);
    expect(
      result.agents.some(
        (w) => w.id === BUILTIN_AGENT_IDS.implementFeature,
      ),
    ).toBe(true);
    for (const agent of result.agents) {
      expect(agent).not.toHaveProperty("instructions");
      expect(agent.name.length).toBeGreaterThan(0);
    }
  });

  it("returns agent definition metadata by id (built-in)", async () => {
    const agent = await getAgentForMcp(
      db,
      teamspaceId,
      BUILTIN_AGENT_IDS.implementFeature,
    );
    expect(agent?.id).toBe(BUILTIN_AGENT_IDS.implementFeature);
    expect(agent).not.toHaveProperty("instructions");
  });

  it("returns null for unknown agent ids", async () => {
    expect(
      await getAgentForMcp(
        db,
        teamspaceId,
        "00000000-0000-4000-8000-000000000099",
      ),
    ).toBeNull();
    expect(
      await getAgentInstructionForMcp(
        db,
        teamspaceId,
        "00000000-0000-4000-8000-000000000099",
      ),
    ).toBeNull();
  });

  it("returns instruction body by id (built-in)", async () => {
    const result = await getAgentInstructionForMcp(
      db,
      teamspaceId,
      BUILTIN_AGENT_IDS.implementFeature,
    );
    expect(result?.agentDefinitionId).toBe(BUILTIN_AGENT_IDS.implementFeature);
    expect(result?.instruction.length).toBeGreaterThan(50);
  });
});
