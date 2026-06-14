import type { ActionContractDefinition } from "@ssota/contracts";

/**
 * SSOTA-on-SSOTA v3.5.4 — active edge types that get a 1:1 `link_<edge_type>` action.
 * Excludes deprecated edges (`belongs_to`, `includes`, …).
 * SSOT: Notion "SSOTA-on-SSOTA 개발 그래프 정의 v3.5.4" §5.
 */
export const SSOTA_DEV_LINK_EDGE_TYPES = [
  "measured_by",
  "implements",
  "plans",
  "assigned_to",
  "reviewed_by",
  "approved_by",
  "ships_in",
  "produces",
  "depends_on",
  "contributes_to",
  "owned_by",
  "accountable_to",
  "tracked_by",
  "informs",
  "supports",
  "explores",
  "addresses",
  "tests",
  "validates",
  "aligns_with",
  "schedules",
  "targets",
  "themes",
  "prd_evolves_from",
  "roadmap_evolves_from",
  "for_release",
  "part_of",
  "specifies",
  "tech_aligns_prd",
  "follows_arch",
  "implements_api",
  "records_decision_for",
  "scopes_feature",
  "references_arch",
  "spawns_task",
  "spawns_story",
  "ux_informs_arch",
  "runbook_for_release",
  "validates_feature",
  "validates_plan",
  "notes_release",
  "plans_cycle",
  "plans_delivery_of",
  "launch_plan_for",
  "for_page",
  "reflects_on",
  "snapshotted_from",
  "defines",
  "illustrates",
  "specifies_page",
  "wireframe_follows_prd",
  "applies_to",
  "documents",
  "ia_follows_prd",
] as const;

export type SsotaDevLinkEdgeType = (typeof SSOTA_DEV_LINK_EDGE_TYPES)[number];

export function buildLinkActionContract(
  edgeType: SsotaDevLinkEdgeType,
): ActionContractDefinition {
  return {
    actionType: `link_${edgeType}`,
    scope: { kind: "edge_type", edgeType },
    preconditions: {
      requiresExistingNode: true,
      requiredFields: ["sourceNodeId", "targetNodeId"],
    },
    effects: [
      {
        kind: "create_edge",
        edge: {
          edgeType,
          sourceNodeId: "",
          targetNodeId: "",
          properties: {},
        },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: "key",
    logPayloadSchema: {},
  };
}

export function listSsotaDevLinkActionContracts(): ActionContractDefinition[] {
  return SSOTA_DEV_LINK_EDGE_TYPES.map(buildLinkActionContract);
}
