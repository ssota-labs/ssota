import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { WORKFLOW_INSTRUCTION_SEEDS } from "@ssota/contracts/workflows";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
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

export async function applyTemplate(
  db: Db,
  projectId: string,
  bundle: TemplateBundle,
): Promise<void> {
  await seedDomainCatalog(db, projectId, {
    nodeTypeKeys: bundle.catalog.nodeTypeKeys,
    edgeTypeKeys: bundle.catalog.edgeTypeKeys,
  });
  await seedWorkflowInstructions(db, projectId, bundle.workflowInstructions);
  await seedPages(db, projectId, bundle.pages);
}
