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

  it("binds skills to agent definitions with ready locks", async () => {
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

    const links = await port.listAgentSkillLinks(agentDefinitionId);
    const link = links.find((l) => l.skillId === skillId);
    expect(link?.lockStatus).toBe("ready");
    expect(link?.lock?.sourceType).toBe("platform");
    expect(link?.lock?.computedHash).toBeTruthy();

    const pkg = await port.getSkillPackageByHash(
      organizationId,
      link!.lock!.computedHash,
    );
    expect(pkg?.files.length).toBeGreaterThan(0);
  });

  it("uniquifies key when registerSkill provenance differs", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const skillMd = `---
name: provenance-test
description: First import
---

Body one
`;
    const first = await port.registerSkill(organizationId, {
      key: "provenance-test",
      name: "Provenance Test",
      description: "First import",
      source: "custom",
      files: [{ path: "SKILL.md", contents: skillMd }],
      metadata: {
        kind: "custom",
        catalogSource: {
          source: "acme/first-repo",
          sourceType: "github",
          skillPath: "skills/provenance-test/SKILL.md",
        },
      },
    });
    expect(first.key).toBe("provenance-test");

    const secondMd = `---
name: provenance-test
description: Second import
---

Body two
`;
    const second = await port.registerSkill(organizationId, {
      key: "provenance-test",
      name: "Provenance Test",
      description: "Second import",
      source: "custom",
      files: [{ path: "SKILL.md", contents: secondMd }],
      metadata: {
        kind: "custom",
        catalogSource: {
          source: "acme/second-repo",
          sourceType: "github",
          skillPath: "skills/provenance-test/SKILL.md",
        },
      },
    });
    expect(second.key).toBe("provenance-test-2");
    expect(second.id).not.toBe(first.id);

    await port.deleteCustomSkill(organizationId, first.id);
    await port.deleteCustomSkill(organizationId, second.id);
  });

  it("updates skill when registerSkill provenance matches", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const catalogSource = {
      source: "acme/update-repo",
      sourceType: "github" as const,
      skillPath: "skills/update-me/SKILL.md",
    };
    const v1 = `---
name: update-me
description: Version one
---

v1
`;
    const created = await port.registerSkill(organizationId, {
      key: "update-me",
      name: "Update Me",
      description: "Version one",
      source: "custom",
      files: [{ path: "SKILL.md", contents: v1 }],
      metadata: { kind: "custom", catalogSource },
    });

    const v2 = `---
name: update-me
description: Version two
---

v2
`;
    const updated = await port.registerSkill(organizationId, {
      key: "update-me",
      name: "Update Me",
      description: "Version two",
      source: "custom",
      files: [{ path: "SKILL.md", contents: v2 }],
      metadata: { kind: "custom", catalogSource },
    });

    expect(updated.id).toBe(created.id);
    expect(updated.description).toBe("Version two");
    const file = await port.readSkillFile(organizationId, updated.id, "SKILL.md");
    expect(file?.contents).toContain("v2");

    await port.deleteCustomSkill(organizationId, updated.id);
  });

  it("batch importSkills registers skills from inline files", async () => {
    if (skip) return;
    const port = createSkillPort(db, { organizationId, teamspaceId });
    const skillA = `---
name: batch-alpha
description: Alpha skill
---

alpha
`;
    const skillB = `---
name: batch-beta
description: Beta skill
---

beta
`;
    const results = await port.importSkills(organizationId, [
      {
        skillPath: "skills/batch-alpha/SKILL.md",
        files: [{ path: "SKILL.md", contents: skillA }],
        folderRootName: "pack-a",
      },
      {
        skillPath: "skills/batch-beta/SKILL.md",
        files: [{ path: "SKILL.md", contents: skillB }],
        folderRootName: "pack-a",
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results[0]?.skill?.key).toBe("batch-alpha");
    expect(results[1]?.skill?.key).toBe("batch-beta");

    for (const result of results) {
      if (result.skill) {
        await port.deleteCustomSkill(organizationId, result.skill.id);
      }
    }
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
