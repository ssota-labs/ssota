import { describe, expect, it } from "vitest";
import {
  SSOTA_DEV_LINK_EDGE_TYPES,
  buildLinkActionContract,
  listSsotaDevLinkActionContracts,
} from "./ssota-dev-link-actions.js";

describe("ssota-dev link action catalog", () => {
  it("declares 54 active edge link actions (belongs_to excluded)", () => {
    expect(SSOTA_DEV_LINK_EDGE_TYPES).toHaveLength(54);
    expect(SSOTA_DEV_LINK_EDGE_TYPES).not.toContain("belongs_to");
  });

  it("builds edge-scoped create_edge contracts", () => {
    const contract = buildLinkActionContract("ships_in");
    expect(contract.actionType).toBe("link_ships_in");
    expect(contract.scope).toEqual({ kind: "edge_type", edgeType: "ships_in" });
    expect(contract.effects).toHaveLength(1);
    expect(contract.effects[0]?.kind).toBe("create_edge");
    expect(contract.idempotencyRule).toBe("key");
  });

  it("lists one contract per edge type", () => {
    const contracts = listSsotaDevLinkActionContracts();
    expect(contracts).toHaveLength(54);
    expect(new Set(contracts.map((c) => c.actionType)).size).toBe(54);
  });
});
