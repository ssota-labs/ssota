import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { SWDL_AGENT_DEFINITION_SEEDS } from "@ssota/contracts/agents";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import { seedAgentDefinitions } from "./agent-definition-port.js";
import { seedPages } from "./page-port.js";

export const SOFTWARE_DEV_TEMPLATE: TemplateBundle = {
  meta: {
    id: "software-development",
    name: "Software Development",
    description:
      "Full SDLC workspace — roadmap, research, initiatives, design, engineering, build, QA, launch and retrospective. Domain agents: SWDL orchestrator + research/planning/delivery/QA specialists (no generic built-in workers; no Main).",
    category: "Engineering",
  },
  catalog: {
    nodeTypeKeys: listNodeTypes(),
    edgeTypeKeys: listEdgeTypes().filter((key) => key !== "agent_owns_page"),
  },
  /** Domain pack agents only — Main is not part of the SWDL template. */
  agentDefinitions: SWDL_AGENT_DEFINITION_SEEDS,
  pages: pagesTreeSeed as unknown as TemplateBundle["pages"],
};

export const BUILTIN_TEMPLATES: TemplateBundle[] = [SOFTWARE_DEV_TEMPLATE];

export function getTemplateBundleById(templateId: string): TemplateBundle | null {
  return BUILTIN_TEMPLATES.find((template) => template.meta.id === templateId) ?? null;
}

/**
 * Apply a Domain Pack template: catalog + domain agents + pages.
 * Does not seed platform Main / teamspace main config — callers that need
 * Console chat must seed those outside the Domain Pack path.
 */
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
  await seedAgentDefinitions(db, teamspaceId, seeds);
  await seedPages(db, teamspaceId, bundle.pages);
}
