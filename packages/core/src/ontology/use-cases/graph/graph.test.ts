import { describe, expect, it } from "vitest";
import { createContractsCatalogReadPort } from "../../adapters/contracts-catalog-read-port.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { createInMemoryGraphCommitPort } from "../../testing/in-memory-action.js";
import { createEdge, createInitiativeBundle, createNode } from "./index.js";

describe("v2.7 graph use cases", () => {
  const catalog = createContractsCatalogReadPort();

  it("rejects unknown node_type on create", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    await expect(
      createNode(
        { catalog, graphRead, graphWrite, commit },
        {
          teamspaceId: "00000000-0000-4000-8000-000000000001",
          catalogKey: "not_real" as "task",
          title: "x",
        },
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN_NODE_TYPE" });
  });

  it("rejects invalid properties", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    await expect(
      createNode(
        { catalog, graphRead, graphWrite, commit },
        {
          teamspaceId: "00000000-0000-4000-8000-000000000001",
          catalogKey: "hypothesis",
          title: "Bad",
          properties: { status: "invalid" },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("allows cross-teamspace edge within same org store", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    const teamspaceA = "00000000-0000-4000-8000-000000000001";
    const teamspaceB = "00000000-0000-4000-8000-000000000002";

    const source = await graphWrite.createNode({
      teamspaceId: teamspaceA,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "A",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const target = await graphWrite.createNode({
      teamspaceId: teamspaceB,
      nodeCatalogId: "00000000-0000-4000-8000-000000000010",
      catalogKey: "release",
      title: "B",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });

    const edge = await createEdge(
      { catalog, graphRead, graphWrite, commit },
      {
        teamspaceId: teamspaceA,
        catalogKey: "paired_with",
        sourceNodeId: source.id,
        targetNodeId: target.id,
      },
    );
    expect(edge.sourceNodeId).toBe(source.id);
    expect(edge.targetNodeId).toBe(target.id);
  });

  it("creates initiative bundle with paired_with edge", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    const teamspaceId = "00000000-0000-4000-8000-000000000099";

    const result = await createInitiativeBundle(
      { catalog, graphRead, graphWrite, commit },
      {
        teamspaceId,
        initiativeTitle: "Bundle initiative",
        releaseVersion: "1.0.0",
      },
    );

    const initiative = await graphRead.getNode({
      teamspaceId,
      nodeId: result.initiativeId,
    });
    const release = await graphRead.getNode({
      teamspaceId,
      nodeId: result.releaseId,
    });
    const edges = await graphRead.traverseEdges({
      teamspaceId,
      nodeId: result.initiativeId,
      direction: "outgoing",
      catalogKey: "paired_with",
    });

    expect(initiative?.catalogKey).toBe("initiative");
    expect(release?.catalogKey).toBe("release");
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe(result.pairedWithEdgeId);
  });

  it("rejects duplicate annual roadmap for the same year", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    const teamspaceId = "00000000-0000-4000-8000-000000000010";
    const base = {
      teamspaceId,
      catalogKey: "roadmap" as const,
      title: "2026 연간 로드맵",
      properties: {
        kind: "annual" as const,
        year: 2026,
        doc_status: "draft" as const,
        content: "# Annual",
      },
    };

    await createNode({ catalog, graphRead, graphWrite, commit }, base);

    await expect(
      createNode(
        { catalog, graphRead, graphWrite, commit },
        { ...base, title: "Duplicate annual" },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects quarter roadmap without quarter property", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });

    await expect(
      createNode(
        { catalog, graphRead, graphWrite, commit },
        {
          teamspaceId: "00000000-0000-4000-8000-000000000011",
          catalogKey: "roadmap",
          title: "2026 Q1",
          properties: { kind: "quarter", year: 2026, content: "# Quarter" },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects duplicate quarter roadmap for the same year", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    const teamspaceId = "00000000-0000-4000-8000-000000000012";
    const base = {
      teamspaceId,
      catalogKey: "roadmap" as const,
      title: "2026 Q1 분기 로드맵",
      properties: {
        kind: "quarter" as const,
        year: 2026,
        quarter: 1 as const,
        doc_status: "draft" as const,
        content: "# Q1",
      },
    };

    await createNode({ catalog, graphRead, graphWrite, commit }, base);

    await expect(
      createNode(
        { catalog, graphRead, graphWrite, commit },
        { ...base, title: "Duplicate Q1" },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("creates ui_component source with v2 content in properties", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const commit = createInMemoryGraphCommitPort(store, { audits: [] });
    const node = await createNode(
      { catalog, graphRead, graphWrite, commit },
      {
        teamspaceId: "00000000-0000-4000-8000-000000000023",
        catalogKey: "ui_component",
        title: "Source component",
        properties: {
          slug: "source-btn",
          tier: "primitive",
          representation: "source",
          contentSchemaVersion: 2,
          entry: "Component.tsx",
          files: {
            "Component.tsx":
              "export default function Component() { return null; }",
          },
        },
      },
    );
    expect(node.properties.files).toEqual({
      "Component.tsx": "export default function Component() { return null; }",
    });
  });
});
