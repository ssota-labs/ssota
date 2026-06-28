import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { WORKFLOW_INSTRUCTION_SEEDS } from "@ssota/contracts/workflows";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import { seedWorkflowInstructions } from "./workflow-instruction-port.js";
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
  workflowInstructions: WORKFLOW_INSTRUCTION_SEEDS,
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
  await seedWorkflowInstructions(db, teamspaceId, bundle.workflowInstructions);
  await seedPages(db, teamspaceId, bundle.pages);
}
