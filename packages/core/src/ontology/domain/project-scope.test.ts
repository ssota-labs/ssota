import { describe, expect, it } from "vitest";
import { assertNodeInProjectScope, enforceProjectScope } from "./project-scope.js";
import { ActionRejectedError } from "../../shared/domain/types.js";
import type { Node } from "../../shared/domain/types.js";

const PROJECT_A = "00000000-0000-4000-8000-000000000001";
const PROJECT_B = "00000000-0000-4000-8000-000000000099";

function node(id: string, teamspaceId: string): Node {
  return {
    id,
    teamspaceId,
    nodeType: "Note",
    lifecycleStatus: "Draft",
    properties: {},
    content: null,
    contentUrl: null,
    provenance: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("project-scope", () => {
  it("거부: 노드 teamspaceId 불일치", async () => {
    await expect(
      assertNodeInProjectScope(PROJECT_A, node("n1", PROJECT_B)),
    ).rejects.toMatchObject({
      code: "ORG_MISMATCH",
    } satisfies Partial<ActionRejectedError>);
  });

  it("enforceProjectScope: update_node가 다른 project 노드를 참조하면 거부", async () => {
    const nodes = new Map<string, Node>([["n1", node("n1", PROJECT_B)]]);

    await expect(
      enforceProjectScope(
        PROJECT_A,
        [{ kind: "update_node", nodeId: "n1", patch: { properties: {} } }],
        async (id) => nodes.get(id) ?? null,
      ),
    ).rejects.toMatchObject({
      code: "ORG_MISMATCH",
    } satisfies Partial<ActionRejectedError>);
  });
});
