import { describe, expect, it } from "vitest";
import edgeCatalogSeed from "../../../seed-packs/software-development-workflow/edge-catalog.json" with {
  type: "json",
};
import gatePoliciesSeed from "../../../seed-packs/software-development-workflow/gate-policies.json" with {
  type: "json",
};
import pagesTreeSeed from "../../../seed-packs/software-development-workflow/pages-tree.json" with {
  type: "json",
};
import workCyclesSeed from "../../../seed-packs/software-development-workflow/work-cycles.json" with {
  type: "json",
};
import { parseGatePath, type GatePathHop } from "./gate-path.js";
import {
  gatePolicyPropertiesSchema,
  type GatePolicyProperties,
} from "./gate-policy-schemas.js";
import { NODE_TYPES } from "./node-types.js";
import {
  workCyclePropertiesSchema,
  type WorkCycleProperties,
  type WorkCycleTopology,
} from "./work-cycle-schemas.js";

/**
 * SWDL work-cycles 시드의 토폴로지 무결성 테스트.
 *
 * work_cycle 노드는 실행 SSOT가 아니라 운영 모델 맵이지만, 맵 자체가 깨져 있으면
 * (dangling edge·도달 불가 stage·죽은 gatePolicyKey 등) Console WorkCycle 맵과
 * GatePolicy 카탈로그가 서로 다른 이야기를 하게 된다. 여기서 구조를 고정한다.
 */

type PageSeed = { key: string };

const cycles: { title: string; properties: WorkCycleProperties }[] =
  workCyclesSeed.map((row) => ({
    title: row.title,
    properties: workCyclePropertiesSchema.parse(row.properties),
  }));

const gatePolicies: GatePolicyProperties[] = gatePoliciesSeed.map((row) =>
  gatePolicyPropertiesSchema.parse(row.properties),
);

const nodeTypeKeys = new Set<string>(NODE_TYPES);
const pageKeys = new Set(
  (pagesTreeSeed as PageSeed[]).map((page) => page.key),
);
const cycleKeys = cycles.map((cycle) => cycle.properties.cycleKey);

type EdgeSeed = { key: string; domainKeys?: string[]; rangeKeys?: string[] };
const edgeSeeds = edgeCatalogSeed as EdgeSeed[];
const edgeSeedByKey = new Map(edgeSeeds.map((edge) => [edge.key, edge]));

/**
 * onPass 효과 전용 정책 — 승인 상태 전이를 차단하는 게이트가 아니라
 * 승인 → 후속 에이전트 스폰 자동화 훅이라 work-cycle 토폴로지의 gate 노드에
 * 붙지 않는다. 여기 나열되지 않은 정책은 반드시 gate 노드 1개 이상이 참조해야 한다.
 */
const EFFECT_ONLY_POLICY_KEYS = new Set([
  // Feature → approved DoR spawn is wired to Cycle C `g-feature`.
  "swdl.pr-approved-onpass-launch",
]);

/** trigger 집합에서 edges를 따라 도달 가능한 node id 집합 (BFS). */
function reachableFrom(
  topology: WorkCycleTopology,
  startIds: string[],
): Set<string> {
  const outgoing = new Map<string, string[]>();
  for (const edge of topology.edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }
  const visited = new Set<string>(startIds);
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) break;
    for (const next of outgoing.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

describe("SWDL work-cycles seed — cycle envelope", () => {
  it("parses every cycle with workCyclePropertiesSchema", () => {
    // cycles 상수 생성 시점에 이미 parse되지만, 실패 위치를 명확히 하기 위해 재확인한다.
    for (const row of workCyclesSeed) {
      expect(() => workCyclePropertiesSchema.parse(row.properties)).not.toThrow();
    }
    expect(cycles.length).toBeGreaterThan(0);
  });

  it("keeps cycleKeys unique", () => {
    expect(new Set(cycleKeys).size).toBe(cycleKeys.length);
  });

  it("keeps sortOrder strictly increasing in seed order", () => {
    const sortOrders = cycles.map((cycle) => cycle.properties.sortOrder);
    for (let i = 1; i < sortOrders.length; i += 1) {
      expect(
        sortOrders[i],
        `sortOrder must strictly increase: ${cycleKeys[i - 1]}(${sortOrders[i - 1]}) → ${cycleKeys[i]}(${sortOrders[i]})`,
      ).toBeGreaterThan(sortOrders[i - 1]!);
    }
  });
});

describe("SWDL work-cycles seed — topology integrity", () => {
  it("keeps topology node ids unique per cycle", () => {
    for (const { properties } of cycles) {
      const ids = properties.topology.nodes.map((node) => node.id);
      expect(
        new Set(ids).size,
        `duplicate node id in cycle ${properties.cycleKey}`,
      ).toBe(ids.length);
    }
  });

  it("resolves every edge endpoint to a node in the same cycle, with no self-loops", () => {
    for (const { properties } of cycles) {
      const nodeIds = new Set(properties.topology.nodes.map((node) => node.id));
      for (const edge of properties.topology.edges) {
        expect(
          nodeIds.has(edge.source),
          `unknown edge source ${edge.source} (${properties.cycleKey}/${edge.id})`,
        ).toBe(true);
        expect(
          nodeIds.has(edge.target),
          `unknown edge target ${edge.target} (${properties.cycleKey}/${edge.id})`,
        ).toBe(true);
        expect(
          edge.source,
          `self-loop edge ${properties.cycleKey}/${edge.id}`,
        ).not.toBe(edge.target);
      }
    }
  });

  it("gives triggers no incoming edges and ends no outgoing edges", () => {
    for (const { properties } of cycles) {
      const { nodes, edges } = properties.topology;
      for (const node of nodes) {
        if (node.kind === "trigger") {
          const incoming = edges.filter((edge) => edge.target === node.id);
          expect(
            incoming,
            `trigger ${properties.cycleKey}/${node.id} must have 0 incoming edges`,
          ).toHaveLength(0);
        }
        if (node.kind === "end") {
          const outgoing = edges.filter((edge) => edge.source === node.id);
          expect(
            outgoing,
            `end ${properties.cycleKey}/${node.id} must have 0 outgoing edges`,
          ).toHaveLength(0);
        }
      }
    }
  });

  it("reaches every non-trigger node from at least one trigger (BFS)", () => {
    for (const { properties } of cycles) {
      const { nodes } = properties.topology;
      const triggerIds = nodes
        .filter((node) => node.kind === "trigger")
        .map((node) => node.id);
      expect(
        triggerIds.length,
        `cycle ${properties.cycleKey} must have at least one trigger`,
      ).toBeGreaterThan(0);
      const reachable = reachableFrom(properties.topology, triggerIds);
      for (const node of nodes) {
        expect(
          reachable.has(node.id),
          `node ${properties.cycleKey}/${node.id} is unreachable from any trigger`,
        ).toBe(true);
      }
    }
  });

  it("lets every trigger reach at least one end node", () => {
    for (const { properties } of cycles) {
      const { nodes } = properties.topology;
      const endIds = new Set(
        nodes.filter((node) => node.kind === "end").map((node) => node.id),
      );
      expect(
        endIds.size,
        `cycle ${properties.cycleKey} must have at least one end node`,
      ).toBeGreaterThan(0);
      for (const trigger of nodes.filter((node) => node.kind === "trigger")) {
        const reachable = reachableFrom(properties.topology, [trigger.id]);
        const reachesEnd = [...reachable].some((id) => endIds.has(id));
        expect(
          reachesEnd,
          `trigger ${properties.cycleKey}/${trigger.id} cannot reach any end node`,
        ).toBe(true);
      }
    }
  });

  it("targets a stage node with every reject_loop edge", () => {
    for (const { properties } of cycles) {
      const nodeById = new Map(
        properties.topology.nodes.map((node) => [node.id, node]),
      );
      for (const edge of properties.topology.edges) {
        if (edge.kind !== "reject_loop") continue;
        expect(
          nodeById.get(edge.target)?.kind,
          `reject_loop ${properties.cycleKey}/${edge.id} must target a stage`,
        ).toBe("stage");
      }
    }
  });
});

describe("SWDL work-cycles seed — gate/policy cross references", () => {
  it("gives every gate node at least one outgoing sequence edge", () => {
    for (const { properties } of cycles) {
      const { nodes, edges } = properties.topology;
      for (const gate of nodes.filter((node) => node.kind === "gate")) {
        const outgoingSequence = edges.filter(
          (edge) => edge.source === gate.id && edge.kind === "sequence",
        );
        expect(
          outgoingSequence.length,
          `gate ${properties.cycleKey}/${gate.id} must have an outgoing sequence edge`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("resolves every gatePolicyKey to a seeded gate policy, and every non-effect-only policy to a gate node", () => {
    const policyKeys = new Set(gatePolicies.map((policy) => policy.policyKey));
    const referencedKeys = new Set<string>();
    for (const { properties } of cycles) {
      for (const node of properties.topology.nodes) {
        if (node.kind !== "gate" || node.gatePolicyKey == null) continue;
        expect(
          policyKeys.has(node.gatePolicyKey),
          `gate ${properties.cycleKey}/${node.id} references unknown policy ${node.gatePolicyKey}`,
        ).toBe(true);
        referencedKeys.add(node.gatePolicyKey);
      }
    }
    // 양방향 커버리지: effect-only 허용 목록을 뺀 모든 정책은 gate 노드에서 참조돼야 한다.
    const mustBeReferenced = [...policyKeys].filter(
      (key) => !EFFECT_ONLY_POLICY_KEYS.has(key),
    );
    expect([...referencedKeys].sort()).toEqual(mustBeReferenced.sort());
    // 허용 목록이 죽은 예외가 되지 않도록: effect-only 키는 실제 시드 정책이고 onPass 효과를 가진다.
    for (const key of EFFECT_ONLY_POLICY_KEYS) {
      const policy = gatePolicies.find((p) => p.policyKey === key);
      expect(policy, `effect-only allowlist key ${key} must exist in seed`).toBeDefined();
      expect(
        policy!.onPass?.effects.length ?? 0,
        `effect-only policy ${key} must declare onPass effects`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("SWDL gate-policies seed — path expressions vs catalogs", () => {
  /** hop 방향 기준으로 edge-catalog domain/range와 nodeCatalogKey 정합을 검사한다. */
  function expectHopResolves(hop: GatePathHop, context: string) {
    expect(
      nodeTypeKeys.has(hop.nodeCatalogKey),
      `${context}: unknown node catalog key ${hop.nodeCatalogKey}`,
    ).toBe(true);
    const edge = edgeSeedByKey.get(hop.edgeCatalogKey);
    expect(
      edge,
      `${context}: edge ${hop.edgeCatalogKey} is not in edge-catalog.json`,
    ).toBeDefined();
    // out-hop은 반대편이 edge range, in-hop은 반대편이 edge domain이어야 한다.
    const allowed =
      hop.direction === "out" ? edge!.rangeKeys ?? [] : edge!.domainKeys ?? [];
    expect(
      allowed.includes(hop.nodeCatalogKey),
      `${context}: ${hop.direction}:${hop.edgeCatalogKey}[${hop.nodeCatalogKey}] — ` +
        `${hop.nodeCatalogKey} is not in edge ${hop.edgeCatalogKey} ${hop.direction === "out" ? "rangeKeys" : "domainKeys"}`,
    ).toBe(true);
  }

  it("parses every require path and resolves every hop against edge-catalog + NODE_TYPES", () => {
    for (const policy of gatePolicies) {
      for (const req of policy.require) {
        const ast = parseGatePath(req.path);
        if (ast.kind !== "related") continue;
        for (const hop of ast.hops) {
          expectHopResolves(hop, `${policy.policyKey} require ${req.path}`);
        }
      }
    }
  });

  it("parses every onPass targetNodePath and resolves every hop against edge-catalog + NODE_TYPES", () => {
    for (const policy of gatePolicies) {
      for (const effect of policy.onPass?.effects ?? []) {
        if (effect.kind !== "spawn_task" || !effect.targetNodePath) continue;
        const ast = parseGatePath(effect.targetNodePath);
        expect(
          ast.kind,
          `${policy.policyKey}: targetNodePath must be a related path`,
        ).toBe("related");
        if (ast.kind !== "related") continue;
        for (const hop of ast.hops) {
          expectHopResolves(
            hop,
            `${policy.policyKey} targetNodePath ${effect.targetNodePath}`,
          );
        }
      }
    }
  });
});

describe("SWDL work-cycles seed — catalog/page/cycle key references", () => {
  it("uses valid NODE_TYPES for topology catalogKeys and includedNodeCatalogKeys", () => {
    for (const { properties } of cycles) {
      for (const key of properties.includedNodeCatalogKeys ?? []) {
        expect(
          nodeTypeKeys.has(key),
          `unknown includedNodeCatalogKey ${key} in cycle ${properties.cycleKey}`,
        ).toBe(true);
      }
      for (const node of properties.topology.nodes) {
        for (const key of node.catalogKeys ?? []) {
          expect(
            nodeTypeKeys.has(key),
            `unknown catalogKey ${key} on node ${properties.cycleKey}/${node.id}`,
          ).toBe(true);
        }
      }
    }
  });

  it("resolves every suggestedPageKey to a page key in pages-tree.json", () => {
    for (const { properties } of cycles) {
      for (const pageKey of properties.suggestedPageKeys ?? []) {
        expect(
          pageKeys.has(pageKey),
          `unknown suggestedPageKey ${pageKey} in cycle ${properties.cycleKey}`,
        ).toBe(true);
      }
    }
  });

  it("resolves every handoffToCycleKey to another cycle's cycleKey", () => {
    const cycleKeySet = new Set(cycleKeys);
    for (const { properties } of cycles) {
      for (const handoffKey of properties.handoffToCycleKeys ?? []) {
        expect(
          cycleKeySet.has(handoffKey),
          `unknown handoffToCycleKey ${handoffKey} in cycle ${properties.cycleKey}`,
        ).toBe(true);
        expect(
          handoffKey,
          `cycle ${properties.cycleKey} must not hand off to itself`,
        ).not.toBe(properties.cycleKey);
      }
    }
  });
});

describe("SWDL gate-policies seed", () => {
  it("parses every gate policy with gatePolicyPropertiesSchema", () => {
    for (const row of gatePoliciesSeed) {
      expect(() => gatePolicyPropertiesSchema.parse(row.properties)).not.toThrow();
    }
    expect(gatePolicies.length).toBeGreaterThan(0);
  });

  it("keeps policyKeys unique", () => {
    const keys = gatePolicies.map((policy) => policy.policyKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
