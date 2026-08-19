import type { AgentDefinitionSeed } from "../agent-definition.js";
import type { ActionType } from "../../ontology/action/action-type.js";
import type { PropertySchemaDefinition } from "../../ontology/catalog/property-schema.js";

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

/**
 * 런타임 정의 타입 시드 — 출하 타입 키(nodeTypeKeys) 대신 **정의 자체**를 싣는다.
 * 도메인 팩(finance 등)은 contracts에 하드코딩된 타입이 없으므로 이 경로로 심는다.
 */
export interface TemplateNodeTypeSeed {
  key: string;
  label: string;
  description?: string;
  keywords?: string[];
  propertySchema: PropertySchemaDefinition;
}

export interface TemplateEdgeTypeSeed {
  key: string;
  label: string;
  description?: string;
  keywords?: string[];
  /** 노드 타입 **키** — 시드 시 catalog id로 해석된다. */
  domainKeys?: string[];
  rangeKeys?: string[];
  propertySchema?: PropertySchemaDefinition | null;
}

export interface TemplateCatalog {
  nodeTypeKeys: string[];
  edgeTypeKeys: string[];
  /** 런타임 정의 타입 (출하 키가 아닌 도메인 팩용) */
  nodeTypes?: TemplateNodeTypeSeed[];
  edgeTypes?: TemplateEdgeTypeSeed[];
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
  /** L2 액션 타입 (org-scoped action_catalog에 upsert) */
  actions?: ActionType[];
  /** @deprecated Use agentDefinitions */
  workflowInstructions?: AgentDefinitionSeed[];
}
