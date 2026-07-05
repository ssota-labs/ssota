import { eq } from "drizzle-orm";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";
import { createSkillPort } from "../src/ports/skill-port.js";
import { seedBuiltinSkills } from "../src/scripts/seed/builtin-skills.js";
import { seedCommunitySkills } from "../src/scripts/seed/community-skills.js";
import * as schema from "../src/db/schema.js";

describe("skills registry", () => {
  const { db, client } = createDb(process.env.DATABASE_URL);
  let organizationId: string;
  let teamspaceId: string;
  let agentDefinitionId: string;
  let skip = false;

  beforeAll(async () => {
    try {
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      const project = org
        ? await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG)
        : null;
      if (!org || !project) {
        skip = true;
        return;
      }
      organizationId = org.id;
      teamspaceId = project.id;

      const agents = await db
        .select()
        .from(schema.agentDefinitions)
        .where(eq(schema.agentDefinitions.teamspaceId, teamspaceId))
        .limit(1);
      agentDefinitionId = agents[0]?.id ?? "";
      await seedBuiltinSkills(db);
      await seedCommunitySkills(db);
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client.end();
  });

  it("excludes platform builtins from library and explore lists", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const library = await port.listLibrarySkills(organizationId);
    const explore = await port.listExploreSkills(organizationId);
    expect(library.some((s) => s.key === "supabase")).toBe(false);
    expect(explore.some((s) => s.key === "supabase")).toBe(false);
    expect(explore.some((s) => s.key === "web-design-guidelines")).toBe(true);
  });

  it("saves explore skill to org library", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const explore = await port.listExploreSkills(organizationId);
    const community = explore.find((s) => s.key === "web-design-guidelines");
    expect(community).toBeDefined();
    await port.addSkillToOrganization(organizationId, community!.id);
    const library = await port.listLibrarySkills(organizationId);
    expect(library.some((s) => s.id === community!.id)).toBe(true);
    await port.removeSkillFromOrganization(organizationId, community!.id);
    const libraryAfter = await port.listLibrarySkills(organizationId);
    expect(libraryAfter.some((s) => s.id === community!.id)).toBe(false);
  });

  it("lists platform builtin skills for organization catalog", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const skills = await port.listForOrganization(organizationId);
    const keys = skills.map((s) => s.key);
    expect(keys).toContain("supabase");
    expect(keys).toContain("ssota-mcp");
  });

  it("reads SKILL.md body without frontmatter", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const skill = await port.getByKey(organizationId, "ssota-mcp");
    expect(skill).not.toBeNull();
    const file = await port.readSkillFile(
      organizationId,
      skill!.id,
      "SKILL.md",
    );
    expect(file?.contents).toContain("SSOTA Development Workflow");
    expect(file?.contents).not.toMatch(/^---\s*\nname:/m);
  });

  it("binds skills to agent definitions", async () => {
    if (skip || !agentDefinitionId) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const catalog = await port.listForOrganization(organizationId);
    const skillId = catalog.find((s) => s.key === "supabase")?.id;
    expect(skillId).toBeDefined();

    await port.updateAgentSkillBindings(teamspaceId, agentDefinitionId, [
      skillId!,
    ]);
    const bound = await port.listForAgentDefinition(agentDefinitionId);
    expect(bound.some((s) => s.key === "supabase")).toBe(true);
  });

  it("creates, updates, and deletes custom org skills", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const created = await port.registerSkill(organizationId, {
      key: "e2e-custom-skill",
      name: "E2E Custom",
      description: "Integration test skill",
      source: "custom",
      body: "Initial body",
    });
    expect(created.source).toBe("custom");

    const file = await port.readSkillFile(
      organizationId,
      created.id,
      "SKILL.md",
    );
    expect(file?.contents).toContain("Initial body");

    const updated = await port.updateCustomSkill(organizationId, created.id, {
      body: "Updated body",
      description: "Updated description",
    });
    expect(updated.description).toBe("Updated description");

    const updatedFile = await port.readSkillFile(
      organizationId,
      created.id,
      "SKILL.md",
    );
    expect(updatedFile?.contents).toContain("Updated body");

    await port.deleteCustomSkill(organizationId, created.id);
    const gone = await port.getById(created.id);
    expect(gone).toBeNull();
  });
});
