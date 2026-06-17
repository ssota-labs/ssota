import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createEdge,
  createInitiativeBundle,
  createNode,
  GraphError,
} from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

let skip = false;

describe("graph ports integration", () => {
  let projectId: string;
  let otherProjectId: string;
  let ports: ReturnType<typeof createGraphPorts>;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let db: ReturnType<typeof createDb>["db"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;
      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      projectId = project.id;

      const [otherProject] = await dbBundle.db
        .insert(schema.projects)
        .values({
          organizationId: org.id,
          slug: `graph-test-${randomUUID().slice(0, 8)}`,
          name: "Graph Test Other",
        })
        .returning();
      otherProjectId = otherProject!.id;

      ports = createGraphPorts(dbBundle.db, { projectId });
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("creates node with catalog validation", async () => {
    const node = await createNode(
      { catalog: ports.catalog, graphRead: ports.graphRead, graphWrite: ports.graphWrite },
      {
        projectId,
        nodeType: "feature",
        title: `Feature ${randomUUID()}`,
        properties: {},
      },
    );
    expect(node.id).toBeTruthy();
    expect(node.nodeType).toBe("feature");
  });

  it("rejects unknown node_type", async () => {
    await expect(
      createNode(
        { catalog: ports.catalog, graphRead: ports.graphRead, graphWrite: ports.graphWrite },
        {
          projectId,
          nodeType: "not_real" as "task",
          title: "x",
        },
      ),
    ).rejects.toBeInstanceOf(GraphError);
  });

  it("rejects edge across projects", async () => {
    const otherPorts = createGraphPorts(db!, { projectId: otherProjectId });
    const source = await otherPorts.graphWrite.createNode({
      projectId: otherProjectId,
      nodeType: "initiative",
      title: "Other project initiative",
    });
    const target = await ports.graphWrite.createNode({
      projectId,
      nodeType: "release",
      title: "Local release",
    });

    await expect(
      createEdge(
        { graphRead: ports.graphRead, graphWrite: ports.graphWrite },
        {
          projectId,
          edgeType: "paired_with",
          sourceNodeId: source.id,
          targetNodeId: target.id,
        },
      ),
    ).rejects.toMatchObject({ code: "PROJECT_MISMATCH" });
  });

  it("creates initiative bundle atomically", async () => {
    const result = await createInitiativeBundle(
      { catalog: ports.catalog, graphWrite: ports.graphWrite },
      {
        projectId,
        initiativeTitle: `Bundle ${randomUUID()}`,
        releaseVersion: "9.9.9-test",
      },
    );

    const initiative = await ports.graphRead.getNode({
      projectId,
      nodeId: result.initiativeId,
    });
    const release = await ports.graphRead.getNode({
      projectId,
      nodeId: result.releaseId,
    });
    const edges = await ports.graphRead.traverseEdges({
      projectId,
      nodeId: result.initiativeId,
      direction: "outgoing",
      edgeType: "paired_with",
    });

    expect(initiative?.nodeType).toBe("initiative");
    expect(release?.nodeType).toBe("release");
    expect(edges.some((edge) => edge.id === result.pairedWithEdgeId)).toBe(true);
  });

  it("creates composed_of edges between ui_component nodes", async () => {
    const composite = await createNode(
      { catalog: ports.catalog, graphRead: ports.graphRead, graphWrite: ports.graphWrite },
      {
        projectId,
        nodeType: "ui_component",
        title: `Composite ${randomUUID()}`,
        properties: { slug: `composite-${randomUUID().slice(0, 8)}`, tier: "composite" },
      },
    );
    const child = await createNode(
      { catalog: ports.catalog, graphRead: ports.graphRead, graphWrite: ports.graphWrite },
      {
        projectId,
        nodeType: "ui_component",
        title: `Child ${randomUUID()}`,
        properties: { slug: `child-${randomUUID().slice(0, 8)}`, tier: "primitive" },
      },
    );

    const edge = await createEdge(
      { graphRead: ports.graphRead, graphWrite: ports.graphWrite },
      {
        projectId,
        edgeType: "composed_of",
        sourceNodeId: composite.id,
        targetNodeId: child.id,
      },
    );

    expect(edge.edgeType).toBe("composed_of");

    const outgoing = await ports.graphRead.traverseEdges({
      projectId,
      nodeId: composite.id,
      direction: "outgoing",
      edgeType: "composed_of",
    });
    expect(outgoing.some((item) => item.targetNodeId === child.id)).toBe(true);
  });
});
