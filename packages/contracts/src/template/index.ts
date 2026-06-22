import type { WorkflowInstructionDefinition } from "../workflows/index.js";

/**
 * A project template: a self-contained bundle that seeds a new project's
 * catalog (node/edge types), workflows, and Notion-style page tree. Built-in
 * templates are assembled in code; the same shape is what a DB-backed templates
 * table / "save project as template" capture produces, so onboarding and the
 * marketplace can apply any template through one `applyTemplate` path.
 */
export interface TemplateMeta {
  /** Stable id / slug (e.g. "software-development"). */
  id: string;
  name: string;
  description: string;
  /** Optional icon key/emoji for galleries. */
  icon?: string;
  /** Optional grouping (e.g. "Engineering", "Marketing"). */
  category?: string;
}

/**
 * The catalog the template seeds. Built-in templates reference shared node/edge
 * type definitions by key (resolved against the embedded catalog at seed time);
 * a fully portable template can later inline the definitions here.
 */
export interface TemplateCatalog {
  nodeTypeKeys: string[];
  edgeTypeKeys: string[];
}

/** One page in the template's Notion-style tree (mirrors the seed JSON shape). */
export interface TemplatePageSeed {
  key: string;
  parentKey: string | null;
  title: string;
  icon?: string;
  /** Node-type drill-in template marker (e.g. "initiative"); null = L0 page. */
  appliesToNodeType?: string | null;
  spec: unknown;
  bindings?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export interface TemplateBundle {
  meta: TemplateMeta;
  catalog: TemplateCatalog;
  workflows: WorkflowInstructionDefinition[];
  pages: TemplatePageSeed[];
}
