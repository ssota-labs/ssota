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
import { createDbCatalogWritePort } from "./ontology/db-catalog-write-port.js";
import { createDbActionCatalogPort } from "./ontology/action-catalog-port.js";
import { FINANCE_TEMPLATE } from "./finance-template.js";

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
export const BUILTIN_TEMPLATES: TemplateBundle[] = [
  EMPTY_TEMPLATE,
  FINANCE_TEMPLATE,
  SOFTWARE_DEV_TEMPLATE,
];

export { FINANCE_TEMPLATE };

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
  // 런타임 정의 타입 — 도메인 팩(finance 등)은 출하 키가 없으므로 정의 자체를 upsert한다.
  const nodeTypes = bundle.catalog.nodeTypes ?? [];
  const edgeTypes = bundle.catalog.edgeTypes ?? [];
  if (nodeTypes.length || edgeTypes.length) {
    const catalogWrite = createDbCatalogWritePort(db, { organizationId });
    const keyToId = new Map<string, string>();
    for (const t of nodeTypes) {
      const row = await catalogWrite.upsertNodeCatalog({
        key: t.key,
        label: t.label,
        description: t.description ?? "",
        keywords: t.keywords ?? [],
        propertySchema: t.propertySchema,
      });
      keyToId.set(t.key, row.id);
    }
    for (const t of edgeTypes) {
      await catalogWrite.upsertEdgeCatalog({
        key: t.key,
        label: t.label,
        description: t.description ?? "",
        keywords: t.keywords ?? [],
        domainCatalogIds: (t.domainKeys ?? []).map((k) => {
          const id = keyToId.get(k);
          if (!id) throw new Error(`template ${bundle.meta.id}: edge '${t.key}' domain '${k}' is not defined in this template`);
          return id;
        }),
        rangeCatalogIds: (t.rangeKeys ?? []).map((k) => {
          const id = keyToId.get(k);
          if (!id) throw new Error(`template ${bundle.meta.id}: edge '${t.key}' range '${k}' is not defined in this template`);
          return id;
        }),
        propertySchema: t.propertySchema ?? null,
      });
    }
  }

  // L2 액션 — 타입이 먼저 있어야 writes/edits의 catalogKey가 유효하다.
  if (bundle.actions?.length) {
    const actionPort = createDbActionCatalogPort(db, { organizationId });
    for (const action of bundle.actions) {
      await actionPort.upsertAction(action);
    }
  }

  const seeds = bundle.agentDefinitions ?? bundle.workflowInstructions ?? [];
  await seedAgentDefinitions(db, teamspaceId, seeds);
  await seedPages(db, teamspaceId, bundle.pages);
  if (bundle.meta.id === "software-development") {
    await seedWorkCycleAndGatePolicies(db, teamspaceId);
  }
}
