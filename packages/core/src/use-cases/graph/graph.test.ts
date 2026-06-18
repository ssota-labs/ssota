import { describe, expect, it } from "vitest";
import { createContractsCatalogReadPort } from "../../adapters/contracts-catalog-read-port.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { createEdge, createInitiativeBundle, createNode } from "./index.js";

describe("v2.7 graph use cases", () => {
  const catalog = createContractsCatalogReadPort();

  it("rejects unknown node_type on create", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000001",
          nodeType: "not_real" as "task",
          title: "x",
        },
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN_NODE_TYPE" });
  });

  it("rejects invalid properties", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000001",
          nodeType: "hypothesis",
          title: "Bad",
          properties: { status: "invalid" },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects edge across projects with PROJECT_MISMATCH", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const projectA = "00000000-0000-4000-8000-000000000001";
    const projectB = "00000000-0000-4000-8000-000000000002";

    const source = await graphWrite.createNode({
      projectId: projectA,
      nodeType: "initiative",
      title: "A",
    });
    const target = await graphWrite.createNode({
      projectId: projectB,
      nodeType: "release",
      title: "B",
    });

    await expect(
      createEdge(
        { graphRead, graphWrite },
        {
          projectId: projectA,
          edgeType: "paired_with",
          sourceNodeId: source.id,
          targetNodeId: target.id,
        },
      ),
    ).rejects.toMatchObject({ code: "PROJECT_MISMATCH" });
  });

  it("creates initiative bundle with paired_with edge", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const projectId = "00000000-0000-4000-8000-000000000099";

    const result = await createInitiativeBundle(
      { catalog, graphWrite },
      {
        projectId,
        initiativeTitle: "Bundle initiative",
        releaseVersion: "1.0.0",
      },
    );

    const initiative = await graphRead.getNode({
      projectId,
      nodeId: result.initiativeId,
    });
    const release = await graphRead.getNode({
      projectId,
      nodeId: result.releaseId,
    });
    const edges = await graphRead.traverseEdges({
      projectId,
      nodeId: result.initiativeId,
      direction: "outgoing",
      edgeType: "paired_with",
    });

    expect(initiative?.nodeType).toBe("initiative");
    expect(release?.nodeType).toBe("release");
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe(result.pairedWithEdgeId);
  });

  it("rejects duplicate annual roadmap for the same year", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const projectId = "00000000-0000-4000-8000-000000000010";
    const base = {
      projectId,
      nodeType: "roadmap" as const,
      title: "2026 연간 로드맵",
      properties: {
        kind: "annual" as const,
        year: 2026,
        doc_status: "draft" as const,
      },
      content: "# Annual",
    };

    await createNode({ catalog, graphRead, graphWrite }, base);

    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        { ...base, title: "Duplicate annual" },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects quarter roadmap without quarter property", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);

    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000011",
          nodeType: "roadmap",
          title: "2026 Q1",
          properties: { kind: "quarter", year: 2026 },
          content: "# Quarter",
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects duplicate quarter roadmap for the same year", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const projectId = "00000000-0000-4000-8000-000000000012";
    const base = {
      projectId,
      nodeType: "roadmap" as const,
      title: "2026 Q1 분기 로드맵",
      properties: {
        kind: "quarter" as const,
        year: 2026,
        quarter: 1 as const,
        doc_status: "draft" as const,
      },
      content: "# Q1",
    };

    await createNode({ catalog, graphRead, graphWrite }, base);

    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        { ...base, title: "Duplicate Q1" },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects ui_component create without content", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000020",
          nodeType: "ui_component",
          title: "Source component",
          properties: {
            slug: "source-btn",
            tier: "primitive",
            representation: "source",
            entry: "Component.tsx",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects ui_component source create without content", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000021",
          nodeType: "ui_component",
          title: "Source component",
          properties: {
            slug: "source-btn",
            tier: "primitive",
            representation: "source",
            entry: "Component.tsx",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects ui_component source create with v1 content", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    await expect(
      createNode(
        { catalog, graphRead, graphWrite },
        {
          projectId: "00000000-0000-4000-8000-000000000022",
          nodeType: "ui_component",
          title: "Bad source component",
          properties: {
            slug: "bad-source",
            tier: "primitive",
            representation: "source",
            entry: "Component.tsx",
          },
          content: JSON.stringify({
            schemaVersion: 1,
            root: {
              kind: "element",
              id: "root",
              tag: "div",
              children: [],
            },
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("creates ui_component source with v2 content", async () => {
    const store = createInMemoryGraphStore();
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const node = await createNode(
      { catalog, graphRead, graphWrite },
      {
        projectId: "00000000-0000-4000-8000-000000000023",
        nodeType: "ui_component",
        title: "Source component",
        properties: {
          slug: "source-btn",
          tier: "primitive",
          representation: "source",
          contentSchemaVersion: 2,
          entry: "Component.tsx",
        },
        content: JSON.stringify({
          schemaVersion: 2,
          files: {
            "Component.tsx":
              "export default function Component() { return null; }",
          },
        }),
      },
    );
    expect(node.content).toContain("schemaVersion");
  });
});
