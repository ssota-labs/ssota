import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { AGENT_DEFINITION_SEEDS } from "@ssota/contracts/agents";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import {
  seedAgentDefinitions,
  seedMainAgentDefinition,
} from "./agent-definition-port.js";
import { seedTeamspaceMainConfig } from "./teamspace-main-config-port.js";
import { seedPages } from "./page-port.js";

export const SOFTWARE_DEV_TEMPLATE: TemplateBundle = {
  meta: {
    id: "software-development",
    name: "Software Development",
    description:
      "Full SDLC workspace — roadmap, research, initiatives, design, engineering, build, QA, launch and retrospective.",
    category: "Engineering",
  },
  catalog: {
    nodeTypeKeys: listNodeTypes(),
    edgeTypeKeys: listEdgeTypes(),
  },
  agentDefinitions: AGENT_DEFINITION_SEEDS,
  pages: pagesTreeSeed as unknown as TemplateBundle["pages"],
};

export const BUILTIN_TEMPLATES: TemplateBundle[] = [SOFTWARE_DEV_TEMPLATE];

export function getTemplateBundleById(templateId: string): TemplateBundle | null {
  return BUILTIN_TEMPLATES.find((template) => template.meta.id === templateId) ?? null;
}

export async function applyTemplate(
  db: Db,
  teamspaceId: string,
  bundle: TemplateBundle,
): Promise<void> {
  const organizationId = await resolveOrganizationIdForTeamspace(db, teamspaceId);
  await seedDomainCatalog(db, organizationId, {
    nodeTypeKeys: bundle.catalog.nodeTypeKeys,
    edgeTypeKeys: bundle.catalog.edgeTypeKeys,
  });
  const seeds = bundle.agentDefinitions ?? bundle.workflowInstructions ?? [];
  await seedTeamspaceMainConfig(db, teamspaceId);
  await seedMainAgentDefinition(db, teamspaceId);
  await seedAgentDefinitions(db, teamspaceId, seeds);
  await seedPages(db, teamspaceId, bundle.pages);
}
