import { describe, expect, it } from "vitest";
import type { SkillIndex } from "@ssota/contracts";
import type { SkillPort } from "@ssota/core";
import { resolveSkillManifest } from "../skill-manifest.js";
import { resolveWorkflowToolNames } from "../workflow/resolve-workflow-tools.js";
import { buildAgentTools } from "../tools/build-agent-tools.js";

function createMockPort(overrides: Partial<SkillPort> = {}): SkillPort {
  return {
    async listForOrganization() {
      return [];
    },
    async listLibrarySkills() {
      return [];
    },
    async listExploreSkills() {
      return [];
    },
    async listForAgentDefinition() {
      return [];
    },
    async getByKey() {
      return null;
    },
    async getById() {
      return null;
    },
    async readSkillFile() {
      return null;
    },
    async listSkillFiles() {
      return [];
    },
    async listAgentSkillLinks() {
      return [];
    },
    async listReadySkillBindings() {
      return [];
    },
    async listOrganizationSkills() {
      return [];
    },
    async getSkillPackageByHash() {
      return null;
    },
    async registerSkill() {
      throw new Error("not implemented");
    },
    async updateCustomSkill() {
      throw new Error("not implemented");
    },
    async deleteCustomSkill() {
      throw new Error("not implemented");
    },
    async updateAgentSkillBindings() {},
    async addSkillToOrganization() {},
    async removeSkillFromOrganization() {},
    async refreshAgentSkillBinding() {
      throw new Error("not implemented");
    },
    async upsertSnapshot() {
      throw new Error("not implemented");
    },
    async upsertSkillPackage() {
      throw new Error("not implemented");
    },
    ...overrides,
  };
}

describe("resolveSkillManifest", () => {
  it("returns empty manifest when agent has no ready bindings", async () => {
    const port = createMockPort();
    const manifest = await resolveSkillManifest(
      port,
      "org-id",
      "00000000-0000-4000-8000-000000000099",
    );
    expect(manifest).toEqual([]);
  });

  it("returns bound skills for task agents", async () => {
    const bound: SkillIndex[] = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        key: "shadcn",
        name: "shadcn",
        description: "UI components",
        source: "builtin",
      },
    ];
    const port = createMockPort({
      async listForAgentDefinition() {
        return bound;
      },
    });
    const manifest = await resolveSkillManifest(
      port,
      "org-id",
      "00000000-0000-4000-8000-000000000099",
    );
    expect(manifest).toEqual(bound);
  });
});

describe("skills.read tool bundle", () => {
  it("includes read_skill when skills.read bundle is enabled", () => {
    const names = resolveWorkflowToolNames({
      toolBundles: ["skills.read"],
    });
    expect(names).toContain("read_skill");

    const tools = buildAgentTools({
      toolBundles: ["skills.read"],
      isMain: false,
    });
    expect(tools).toHaveProperty("read_skill");
  });
});
