import { describe, expect, it } from "vitest";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import type { SkillIndex } from "@ssota/contracts";
import type { SkillPort } from "@ssota/core";
import { resolveSkillManifest } from "../skill-manifest.js";
import { resolveWorkflowToolNames } from "../workflow/resolve-workflow-tools.js";
import { buildAgentTools } from "../tools/build-agent-tools.js";

describe("resolveSkillManifest", () => {
  const builtins: SkillIndex[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      key: "supabase",
      name: "Supabase",
      description: "Supabase guidance",
      source: "builtin",
    },
  ];

  const port: SkillPort = {
    async listForOrganization() {
      return builtins;
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
    async upsertSnapshot() {
      throw new Error("not implemented");
    },
  };

  it("falls back to platform builtins for main agent when unbound", async () => {
    const manifest = await resolveSkillManifest(
      port,
      "org-id",
      BUILTIN_AGENT_IDS.main,
    );
    expect(manifest).toEqual(builtins);
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
    const boundPort: SkillPort = {
      ...port,
      async listForAgentDefinition() {
        return bound;
      },
    };
    const manifest = await resolveSkillManifest(
      boundPort,
      "org-id",
      BUILTIN_AGENT_IDS.implementFeature,
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
