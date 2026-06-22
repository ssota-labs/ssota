import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { WORKFLOW_REGISTRY } from "@ssota/contracts/workflows";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { seedWorkflows } from "./workflow-port.js";
import { seedPages } from "./page-port.js";

/**
 * Built-in "Software Development" template — the bundle that was previously
 * applied implicitly at onboarding. Assembled from the embedded catalog /
 * workflow registry / page-tree seed. Future built-in domains add a sibling
 * bundle here; user templates come from a DB `templates` table (capture).
 */
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
  workflows: Object.values(WORKFLOW_REGISTRY),
  pages: pagesTreeSeed as unknown as TemplateBundle["pages"],
};

/** All built-in templates (mirrored into the templates table in a later step). */
export const BUILTIN_TEMPLATES: TemplateBundle[] = [SOFTWARE_DEV_TEMPLATE];

/**
 * Seed a new project from a template bundle: catalog → workflows → pages.
 * Idempotent (each seeder is). The single entry point onboarding / template
 * selection / marketplace all go through.
 */
export async function applyTemplate(
  db: Db,
  projectId: string,
  bundle: TemplateBundle,
): Promise<void> {
  await seedDomainCatalog(db, projectId, {
    nodeTypeKeys: bundle.catalog.nodeTypeKeys,
    edgeTypeKeys: bundle.catalog.edgeTypeKeys,
  });
  await seedWorkflows(db, projectId, bundle.workflows);
  await seedPages(db, projectId, bundle.pages);
}
