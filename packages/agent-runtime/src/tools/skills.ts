import { tool, type ToolSet } from "ai";
import { ReadSkillInputSchema } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";
import { getSkillPort, ensureTeamspaceOrganizationScope } from "../ports.js";
import { getRunContext } from "./context.js";

async function resolveBoundSkillKeys(
  organizationId: string,
  agentDefinitionId: string | undefined,
): Promise<Set<string>> {
  const port = getSkillPort(organizationId);
  if (agentDefinitionId) {
    const bound = await port.listForAgentDefinition(agentDefinitionId);
    if (bound.length > 0) {
      return new Set(bound.map((s) => s.key));
    }
    if (agentDefinitionId === BUILTIN_AGENT_IDS.main) {
      const catalog = await port.listForOrganization(organizationId);
      return new Set(
        catalog.filter((s) => s.source === "builtin").map((s) => s.key),
      );
    }
  }
  return new Set();
}

export function createSkillTools(): ToolSet {
  return {
    read_skill: tool({
      description:
        "Load the full body of a bound skill by key. Use when the task matches a skill description from the Available skills manifest. Optional file path defaults to SKILL.md.",
      inputSchema: ReadSkillInputSchema,
      execute: async (input, options) => {
        const ctx = getRunContext(options);
        const organizationId = await ensureTeamspaceOrganizationScope(
          ctx.teamspaceId,
        );
        const allowedKeys = await resolveBoundSkillKeys(
          organizationId,
          ctx.agentDefinitionId,
        );
        if (!allowedKeys.has(input.key)) {
          return {
            error: `Skill "${input.key}" is not bound to this agent.`,
          };
        }

        const port = getSkillPort(organizationId);
        const skill = await port.getByKey(organizationId, input.key);
        if (!skill) {
          return { error: `Skill "${input.key}" not found in catalog.` };
        }

        const filePath = input.file ?? "SKILL.md";
        const file = await port.readSkillFile(
          organizationId,
          skill.id,
          filePath,
        );
        if (!file) {
          return { error: `File "${filePath}" not found for skill "${input.key}".` };
        }

        return {
          key: skill.key,
          name: skill.name,
          file: file.path,
          content: file.contents,
        };
      },
    }),
  };
}
