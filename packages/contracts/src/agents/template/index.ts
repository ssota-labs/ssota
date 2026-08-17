import type { AgentDefinitionSeed } from "../agent-definition.js";

/**
 * A project template: a self-contained bundle that seeds a new project's
 * catalog (node/edge types), agent definitions, and Notion-style page tree.
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

export interface TemplateCatalog {
  nodeTypeKeys: string[];
  edgeTypeKeys: string[];
}

export interface TemplatePageSeed {
  key: string;
  parentKey: string | null;
  title: string;
  icon?: string;
  appliesToNodeType?: string | null;
  spec: unknown;
  bindings?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export interface TemplateBundle {
  meta: TemplateMeta;
  catalog: TemplateCatalog;
  agentDefinitions: AgentDefinitionSeed[];
  pages: TemplatePageSeed[];
  /** @deprecated Use agentDefinitions */
  workflowInstructions?: AgentDefinitionSeed[];
}
