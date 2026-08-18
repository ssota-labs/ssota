import {
  listNodeTypes,
  listEdgeTypes,
  type TemplateBundle,
} from "@ssota/contracts";
import { SWDL_AGENT_DEFINITION_SEEDS } from "@ssota/contracts/agents";
import pagesTreeSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages-tree.json" with { type: "json" };
import type { Db } from "../db/client.js";
import { seedDomainCatalog } from "./ontology/db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import { seedAgentDefinitions } from "./agents/agent-definition-port.js";
import { seedPages } from "./ontology/page-port.js";
import { seedWorkCycleAndGatePolicies } from "./ontology/seed-work-cycles.js";

export const SOFTWARE_DEV_TEMPLATE: TemplateBundle = {
  meta: {
    id: "software-development",
    name: "Software Development",
    description:
      "Full SDLC workspace — roadmap, research, initiatives, design, engineering, build, QA, launch and retrospective. Domain agents: SWDL orchestrator + research/planning/delivery/QA/design specialists (no generic built-in workers; no Main).",
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

/**
 * 빈 워크스페이스 — **기본 템플릿**. 카탈로그·에이전트·페이지를 아무것도 심지 않는다.
 * 도메인(finance 등)은 Ontology 페이지·에이전트·템플릿으로 사용자가 정의한다 (AIP식 IA).
 * SWDL은 선택 템플릿으로 남긴다 — 코드 삭제는 finance 검증 후 (ADR-aip-console-concepts).
 */
export const EMPTY_TEMPLATE: TemplateBundle = {
  meta: {
    id: "empty",
    name: "Empty workspace",
    description:
      "Start from a blank ontology. Define object types, links, actions and pages yourself or with an agent.",
    category: "General",
  },
  catalog: { nodeTypeKeys: [], edgeTypeKeys: [] },
  agentDefinitions: [],
  pages: [],
};

/** 첫 항목이 온보딩 기본 선택이다. */
export const BUILTIN_TEMPLATES: TemplateBundle[] = [EMPTY_TEMPLATE, SOFTWARE_DEV_TEMPLATE];

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
  if (bundle.meta.id === "software-development") {
    await seedWorkCycleAndGatePolicies(db, teamspaceId);
  }
}
