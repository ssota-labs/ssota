import { describe, expect, it } from "vitest";
import { GatePathParseError, parseGatePath } from "./gate-path.js";
import { gatePolicyPropertiesSchema } from "./gate-policy-schemas.js";
import { parseNodeProperties } from "./node-types.js";
import { workCyclePropertiesSchema } from "./work-cycle-schemas.js";
import gatePoliciesSeed from "../../../seed-packs/software-development-workflow/gate-policies.json" with { type: "json" };
import workCyclesSeed from "../../../seed-packs/software-development-workflow/work-cycles.json" with { type: "json" };

describe("parseGatePath", () => {
  it("parses self property paths", () => {
    expect(parseGatePath("self.status")).toEqual({
      kind: "self",
      propPath: "status",
    });
    expect(parseGatePath("self.nested.field")).toEqual({
      kind: "self",
      propPath: "nested.field",
    });
  });

  it("parses related hops with property", () => {
    expect(
      parseGatePath(
        "out:for_initiative[initiative]/in:for_initiative[prd].status",
      ),
    ).toEqual({
      kind: "related",
      hops: [
        {
          direction: "out",
          edgeCatalogKey: "for_initiative",
          nodeCatalogKey: "initiative",
        },
        {
          direction: "in",
          edgeCatalogKey: "for_initiative",
          nodeCatalogKey: "prd",
        },
      ],
      propPath: "status",
    });
  });

  it("parses related hops without property (count mode)", () => {
    expect(parseGatePath("out:for_initiative[initiative]")).toEqual({
      kind: "related",
      hops: [
        {
          direction: "out",
          edgeCatalogKey: "for_initiative",
          nodeCatalogKey: "initiative",
        },
      ],
      propPath: null,
    });
  });

  it("rejects invalid paths", () => {
    expect(() => parseGatePath("")).toThrow(GatePathParseError);
    expect(() => parseGatePath("self.")).toThrow(GatePathParseError);
    expect(() => parseGatePath("sideways:for_initiative[initiative]")).toThrow(
      GatePathParseError,
    );
    expect(() => parseGatePath("out:for_initiative")).toThrow(GatePathParseError);
  });
});

describe("gate_policy / work_cycle schemas", () => {
  it("parses every seeded gate policy", () => {
    expect(gatePoliciesSeed.length).toBeGreaterThanOrEqual(3);
    for (const row of gatePoliciesSeed) {
      const parsed = gatePolicyPropertiesSchema.parse(row.properties);
      expect(parsed.policyKey).toMatch(/^swdl\./);
      parseNodeProperties("gate_policy", row.properties);
    }
  });

  it("parses every seeded work cycle", () => {
    expect(workCyclesSeed).toHaveLength(7);
    for (const row of workCyclesSeed) {
      const parsed = workCyclePropertiesSchema.parse(row.properties);
      expect(parsed.topology.nodes.length).toBeGreaterThan(0);
      parseNodeProperties("work_cycle", row.properties);
    }
  });

  it("maps every seeded blocking gate policy to one work-cycle gate node", () => {
    // onPass 효과 전용 정책은 토폴로지 gate 노드에 붙지 않는다
    // (SSOT 목록·사유: swdl-work-cycles.test.ts의 EFFECT_ONLY_POLICY_KEYS).
    const effectOnlyPolicyKeys = new Set([
      // Feature → approved DoR spawn is wired to Cycle C `g-feature`.
      "swdl.pr-approved-onpass-launch",
    ]);
    const policyKeys = new Set(
      gatePoliciesSeed
        .map((row) => gatePolicyPropertiesSchema.parse(row.properties).policyKey)
        .filter((key) => !effectOnlyPolicyKeys.has(key)),
    );
    const referencedPolicyKeys = workCyclesSeed.flatMap((row) => {
      const { topology } = workCyclePropertiesSchema.parse(row.properties);
      return topology.nodes.flatMap((node) =>
        node.kind === "gate" && node.gatePolicyKey
          ? [node.gatePolicyKey]
          : [],
      );
    });

    expect(referencedPolicyKeys).toHaveLength(policyKeys.size);
    expect(new Set(referencedPolicyKeys)).toEqual(policyKeys);
  });

  it("rejects count on self path", () => {
    expect(() =>
      gatePolicyPropertiesSchema.parse({
        policyKey: "bad",
        when: "before_create_node",
        match: { catalogKey: "task" },
        require: [
          {
            path: "self.status",
            ifMissing: "fail",
            count: { min: 1 },
          },
        ],
        onFail: { code: "GATE_PENDING" },
      }),
    ).toThrow();
  });
});
