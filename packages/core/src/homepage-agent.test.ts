import { describe, expect, it } from "vitest";
import { DEFAULT_TITLE_FIELD } from "./catalog/property-schema.js";
import { toCatalogLabel, toCatalogSlug } from "./catalog-slug.js";
import { executeAction } from "./index.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  seedTestCatalog,
  TEST_PROJECT_ID,
} from "./testing/in-memory.js";
import type { LifecycleStatus } from "@ssota/contracts";

const defaultTransitions: Record<LifecycleStatus, LifecycleStatus[]> = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [],
};

function seedHomepageAgentInMemory(
  state: ReturnType<typeof createInMemoryState>,
): void {
  seedTestCatalog(state);

  const tenantSchema = {
    title: { ...DEFAULT_TITLE_FIELD },
    subject_id: {
      valueType: "string",
      constraints: { minLength: 1 },
      required: true,
      system: false,
    },
  };

  for (const [nodeType, family, archetypeId, refs, extraSchema] of [
    [
      "HomepageProject",
      "operational",
      "op-project",
      ["create_node", "link_homepage_contains"],
      {},
    ],
    ["DesignBrief", "document", "doc-spec", ["create_node", "link_homepage_contains"], {}],
    [
      "PageSection",
      "document",
      "doc-spec",
      ["create_node", "link_homepage_contains"],
      {
        section_key: {
          valueType: "string",
          constraints: { maxLength: 100 },
          required: false,
          system: false,
        },
      },
    ],
  ] as const) {
    state.archetypes.set(archetypeId, {
      id: archetypeId,
      name: nodeType,
      family,
      typicalValues: {},
      allowedMutations: ["update_properties"],
    });
    state.nodeCatalog.set(nodeType, {
      nodeType,
      slug: toCatalogSlug(nodeType),
      label: toCatalogLabel(nodeType),
      family,
      archetypeId,
      typicalValueOverrides: {},
      lifecycleTransitions: defaultTransitions,
      contentGuide: null,
      propertySchema: { ...tenantSchema, ...extraSchema },
      allowedActionRefs: [...refs],
    });
  }

  state.edgeCatalog.set("homepage_contains", {
    edgeType: "homepage_contains",
    slug: toCatalogSlug("homepage_contains"),
    label: toCatalogLabel("homepage_contains"),
    domain: ["HomepageProject"],
    range: ["DesignBrief", "PageSection"],
    cardinality: "one-to-many",
    representation: "directed",
  });

  state.actionCatalog.set("link_homepage_contains", {
    actionType: "link_homepage_contains",
    slug: toCatalogSlug("link_homepage_contains"),
    label: toCatalogLabel("link_homepage_contains"),
    scope: { kind: "edge_type", edgeType: "homepage_contains" },
    preconditions: {
      requiresExistingNode: true,
      requiredFields: ["sourceNodeId", "targetNodeId"],
    },
    effects: [
      {
        kind: "create_edge",
        edge: {
          edgeType: "homepage_contains",
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
  });

  for (const [nodeType, propertyKey] of [
    ["HomepageProject", "title"],
    ["HomepageProject", "subject_id"],
    ["DesignBrief", "title"],
    ["DesignBrief", "subject_id"],
    ["PageSection", "title"],
    ["PageSection", "subject_id"],
    ["PageSection", "section_key"],
  ] as const) {
    state.permissions.push({
      actionType: "create_node",
      nodeType,
      propertyKey,
      operation: "create",
      permissionType: "allow",
      valueConstraint: null,
      requiresHumanGate: false,
      status: "active",
    });
  }
}

describe("homepage agent vertical slice", () => {
  it("통과: project → brief → link under same subject_id", async () => {
    const state = createInMemoryState();
    seedHomepageAgentInMemory(state);
    const ports = createInMemoryPorts(state);
    const subjectId = "usr_acme_42";

    const project = await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "HomepageProject", title: "Acme 2026 Homepage" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId,
      projectId: TEST_PROJECT_ID,
    });
    expect(project.status).toBe("committed");

    const brief = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "DesignBrief",
        title: "Acme brief",
        content: "B2B SaaS, trustworthy tone, Korean + English",
      },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId,
      projectId: TEST_PROJECT_ID,
    });
    expect(brief.status).toBe("committed");

    const projects = await ports.graph.queryNodes({
      nodeType: "HomepageProject",
      subjectId,
    });
    const briefs = await ports.graph.queryNodes({
      nodeType: "DesignBrief",
      subjectId,
    });
    expect(projects).toHaveLength(1);
    expect(briefs).toHaveLength(1);

    const link = await executeAction(ports, {
      actionType: "link_homepage_contains",
      input: {
        sourceNodeId: projects[0]!.id,
        targetNodeId: briefs[0]!.id,
      },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId,
      projectId: TEST_PROJECT_ID,
    });
    expect(link.status).toBe("committed");

    const edges = await ports.graph.traverseEdges({
      nodeId: projects[0]!.id,
      direction: "outgoing",
      edgeType: "homepage_contains",
      subjectId,
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]?.targetNodeId).toBe(briefs[0]!.id);
  });

  it("거부: link across different subjects", async () => {
    const state = createInMemoryState();
    seedHomepageAgentInMemory(state);
    const ports = createInMemoryPorts(state);

    await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "HomepageProject", title: "A" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_a",
      projectId: TEST_PROJECT_ID,
    });
    await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "DesignBrief", title: "B brief", content: "body" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_b",
      projectId: TEST_PROJECT_ID,
    });

    const project = (
      await ports.graph.queryNodes({
        nodeType: "HomepageProject",
        subjectId: "usr_a",
      })
    )[0]!;
    const brief = (
      await ports.graph.queryNodes({
        nodeType: "DesignBrief",
        subjectId: "usr_b",
      })
    )[0]!;

    const link = await executeAction(ports, {
      actionType: "link_homepage_contains",
      input: { sourceNodeId: project.id, targetNodeId: brief.id },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_a",
      projectId: TEST_PROJECT_ID,
    });

    expect(link.status).toBe("rejected");
    if (link.status === "rejected") {
      expect(link.code).toBe("SUBJECT_MISMATCH");
    }
  });
});
