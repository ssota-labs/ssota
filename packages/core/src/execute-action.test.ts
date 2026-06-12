import { describe, expect, it } from "vitest";
import { toCatalogLabel, toCatalogSlug } from "./catalog-slug.js";
import { executeAction } from "./index.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  createTestNode,
  seedTestCatalog,
  TEST_PROJECT_ID,
} from "./testing/in-memory.js";
import type { ActionLogRecord } from "./domain/types.js";

function noteCreateInput(overrides?: Record<string, unknown>) {
  return {
    nodeType: "Note",
    title: "Test note",
    content: "Hello SSOTA",
    ...overrides,
  };
}

describe("executeAction — 4대 강제", () => {
  it("거부: 카탈로그에 없는 액션", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "nonexistent_action",
      input: {},
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });

  it("거부: preconditions 미충족", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: {},
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      // resolveEffects runs before checkPreconditions; empty nodeType fails catalog first
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });

  it("통과: create_node(Note) 커밋 + 로그", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: noteCreateInput({ content: "Hello SSOTA" }),
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("committed");
    expect(state.nodes.size).toBe(1);
    expect(state.actionLog.length).toBe(1);
    expect(state.actionLog[0]?.outcome).toBe("committed");
  });

  it("게이트: Human executor 필요한 promote는 Agent가 호출하면 큐 적재", async () => {
    const node = createTestNode();
    const state = createInMemoryState({ nodes: [node] });
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "promote_note",
      input: { nodeId: node.id },
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("gated");
    if (result.status === "gated") {
      expect(state.gates.has(result.gateId)).toBe(true);
    }
    expect(node.lifecycleStatus).toBe("Draft");
    expect(state.actionLog.some((l: ActionLogRecord) => l.outcome === "gated")).toBe(true);
  });

  it("거부: permission deny", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const noteEntry = state.nodeCatalog.get("Note")!;
    state.nodeCatalog.set("Note", {
      ...noteEntry,
      propertySchema: {
        ...noteEntry.propertySchema,
        secret: { valueType: "string", constraints: {}, required: false, system: false },
      },
    });
    state.permissions.push({
      actionType: "create_node",
      nodeType: "Note",
      propertyKey: "secret",
      operation: "write",
      permissionType: "deny",
      valueConstraint: null,
      requiresHumanGate: false,
      status: "active",
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: noteCreateInput({
        content: "x",
        properties: { title: "x", secret: "no" },
      }),
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("PERMISSION_DENIED");
    }
  });

  it("멱등: 동일 idempotencyKey 재호출은 기존 결과 반환", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const params = {
      actionType: "create_node",
      input: noteCreateInput({ content: "Once" }),
      executorId: "agent-1",
      executorType: "Agent" as const,
      idempotencyKey: "key-123",
      projectId: TEST_PROJECT_ID,
    };

    const first = await executeAction(ports, params);
    const second = await executeAction(ports, params);

    expect(first.status).toBe("committed");
    expect(second.status).toBe("committed");
    if (first.status === "committed" && second.status === "committed") {
      expect(second.logId).toBe(first.logId);
    }
    expect(state.nodes.size).toBe(1);
  });

  it("감사: 모든 커밋은 action_log에 기록", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    await executeAction(ports, {
      actionType: "create_node",
      input: noteCreateInput({ content: "Logged" }),
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(state.actionLog.length).toBe(1);
    expect(state.actionLog[0]?.actionType).toBe("create_node");
    expect(state.actionLog[0]?.metadata?.displayAction).toBe("create_note");
  });
});

describe("executeAction — define_node_type", () => {
  const defaultTransitions = {
    Draft: ["Active", "Archived"] as const,
    Active: ["Archived", "Draft"] as const,
    Archived: ["Active"] as const,
    Deleted: [] as const,
  };

  const validDefinition = {
    nodeType: "Memo",
    family: "document" as const,
    archetypeId: "doc-note",
    typicalValueOverrides: {},
    lifecycleTransitions: defaultTransitions,
    contentGuide: "Team memo node type",
  };

  it("통과: Human executor define_node_type 커밋", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: { definition: validDefinition },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("committed");
    expect(state.nodeCatalog.has("Memo")).toBe(true);
    expect(state.actionLog.some((l) => l.actionType === "define_node_type")).toBe(
      true,
    );
  });

  it("거부: duplicate node type", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: {
        definition: { ...validDefinition, nodeType: "Note" },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("DUPLICATE_NODE_TYPE");
    }
  });

  it("거부: missing archetype", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: {
        definition: { ...validDefinition, archetypeId: "missing-archetype" },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });

  it("거부: bad lifecycle transition shape", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: {
        definition: {
          ...validDefinition,
          lifecycleTransitions: { Draft: ["Active"] },
        },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("INVALID_LIFECYCLE_TRANSITIONS");
    }
  });

  it("통과: Agent executor define_node_type 커밋", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: { definition: validDefinition },
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("committed");
    expect(state.nodeCatalog.has("Memo")).toBe(true);
    expect(state.actionLog.some((l) => l.actionType === "define_node_type")).toBe(
      true,
    );
  });
});

describe("executeAction — follow-up catalog meta actions", () => {
  it("게이트: breaking update_node_type lifecycle change", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    state.actionCatalog.set("update_node_type", {
      actionType: "update_node_type",
      slug: "update_node_type",
      label: "Update Node Type",
      scope: { kind: "global" },
      preconditions: { requiredFields: ["nodeType", "patch"] },
      effects: [
        {
          kind: "upsert_node_catalog_entry",
          entry: {
            nodeType: "",
            family: "document",
            archetypeId: "",
            typicalValueOverrides: {},
            lifecycleTransitions: {
              Draft: ["Active"],
              Active: ["Archived"],
              Archived: [],
              Deleted: [],
            },
            contentGuide: null,
            propertySchema: {},
            allowedActionRefs: [],
          },
        },
      ],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "update_node_type",
      input: {
        nodeType: "Note",
        patch: {
          lifecycleTransitions: {
            Draft: ["Active"],
            Active: ["Archived"],
            Archived: [],
            Deleted: [],
          },
        },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("gated");
  });

  it("거부: deprecate_node_type when nodes exist", async () => {
    const node = createTestNode();
    const state = createInMemoryState({ nodes: [node] });
    seedTestCatalog(state);
    state.actionCatalog.set("deprecate_node_type", {
      actionType: "deprecate_node_type",
      slug: "deprecate_node_type",
      label: "Deprecate Node Type",
      scope: { kind: "global" },
      preconditions: { requiredFields: ["nodeType"] },
      effects: [{ kind: "deprecate_node_catalog_entry", nodeType: "" }],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "deprecate_node_type",
      input: { nodeType: "Note" },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_IN_USE");
    }
  });

  it("거부: define_action_contract with catalog effect", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    state.actionCatalog.set("define_action_contract", {
      actionType: "define_action_contract",
      slug: "define_action_contract",
      label: "Define Action Contract",
      scope: { kind: "global" },
      preconditions: { requiredFields: ["definition"] },
      effects: [{ kind: "upsert_action_catalog_entry", entry: { actionType: "", scope: { kind: "global" }, preconditions: {}, effects: [], executor: "Agent", allowedLifecycleTransitions: {}, failureMode: "reject", logPayloadSchema: {} } }],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_action_contract",
      input: {
        definition: {
          actionType: "evil_action",
          preconditions: {},
          effects: [{ kind: "upsert_node_catalog_entry", entry: { nodeType: "Evil", family: "document", archetypeId: "doc-note", typicalValueOverrides: {}, lifecycleTransitions: { Draft: ["Active"], Active: [], Archived: [], Deleted: [] } } }],
          executor: "Agent",
          allowedLifecycleTransitions: {},
          failureMode: "reject",
          logPayloadSchema: {},
        },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("UNSAFE_EFFECT");
    }
  });
});

describe("executeAction — Phase 3 scoped graph enforcement", () => {
  it("거부: schema에 없는 property write", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: noteCreateInput({
        content: "x",
        properties: { title: "x", unknown_property: "no" },
      }),
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("PROPERTY_NOT_BOUND");
    }
  });

  it("거부: property valueType 위반", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: {
        nodeType: "Note",
        content: "x",
        properties: { title: 42 },
      },
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("INVALID_PROPERTY_VALUE");
    }
  });

  it("게이트: property permission requiresHumanGate", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const noteEntry = state.nodeCatalog.get("Note")!;
    state.nodeCatalog.set("Note", {
      ...noteEntry,
      propertySchema: {
        ...noteEntry.propertySchema,
        priority: { valueType: "string", constraints: {}, required: false, system: false },
      },
    });
    state.permissions.push({
      actionType: "create_node",
      nodeType: "Note",
      propertyKey: "priority",
      operation: "write",
      permissionType: "allow",
      valueConstraint: null,
      requiresHumanGate: true,
      status: "active",
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: noteCreateInput({
        content: "x",
        properties: { title: "x", priority: "high" },
      }),
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("gated");
  });

  it("거부: action scope와 node type 불일치", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    state.actionCatalog.set("scoped_document_create", {
      actionType: "scoped_document_create",
      slug: "scoped_document_create",
      label: "Scoped Document Create",
      scope: { kind: "node_type", nodeType: "Document" },
      preconditions: { requiredFields: ["nodeType"] },
      effects: [
        {
          kind: "create_node",
          node: {
            nodeType: "Note",
            lifecycleStatus: "Draft",
            properties: {},
            content: null,
            contentUrl: null,
            provenance: {},
          },
        },
      ],
      executor: "Agent",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "scoped_document_create",
      input: { nodeType: "Note", title: "x", content: "x" },
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("ACTION_SCOPE_MISMATCH");
    }
  });

  it("거부: instruction workflow가 없는 action을 참조", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    state.actionCatalog.set("define_instruction", {
      actionType: "define_instruction",
      slug: "define_instruction",
      label: "Define Instruction",
      scope: { kind: "global" },
      preconditions: { requiredFields: ["definition"] },
      effects: [
        {
          kind: "upsert_instruction_catalog_entry",
          entry: {
            title: "",
            triggerPatterns: ["manual"],
            applicableNodeTypes: [],
            requiredActions: [],
            optionalActions: [],
            lifecycle: "Active",
            body: "",
            scope: { kind: "global" },
            triggers: [],
            workflowSteps: [],
            allowedActions: [],
            outputContract: {},
            gatePolicy: {},
            completionCriteria: null,
          },
        },
      ],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_instruction",
      input: {
        definition: {
          title: "Broken workflow",
          triggerPatterns: ["manual"],
          applicableNodeTypes: [],
          requiredActions: [],
          optionalActions: [],
          lifecycle: "Active",
          body: "This references a missing action.",
          scope: { kind: "global" },
          workflowSteps: [
            { id: "step1", title: "Step 1", actionRefs: ["missing_action"] },
          ],
        },
      },
      executorId: "human-1",
      executorType: "Human",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });
});

function seedSubjectScopedProjectCatalog(
  state: ReturnType<typeof createInMemoryState>,
): void {
  seedTestCatalog(state);
  state.nodeCatalog.set("Project", {
    nodeType: "Project",
    slug: toCatalogSlug("Project"),
    label: toCatalogLabel("Project"),
    family: "operational",
    archetypeId: "op-project",
    typicalValueOverrides: {},
    lifecycleTransitions: {
      Draft: ["Active", "Archived"],
      Active: ["Archived", "Draft"],
      Archived: ["Active"],
      Deleted: [],
    },
    contentGuide: "Tenant-scoped project",
    propertySchema: {
      title: { valueType: "string", constraints: { maxLength: 500 }, required: true, system: true },
      subject_id: {
        valueType: "string",
        constraints: { minLength: 1 },
        required: true,
        system: false,
      },
    },
    allowedActionRefs: [],
  });
  state.archetypes.set("op-project", {
    id: "op-project",
    name: "Project",
    family: "operational",
    typicalValues: { stateMachine: "project" },
    allowedMutations: ["update_properties"],
  });
  state.permissions.push(
    {
      actionType: "create_node",
      nodeType: "Project",
      propertyKey: "title",
      operation: "create",
      permissionType: "allow",
      valueConstraint: null,
      requiresHumanGate: false,
      status: "active",
    },
    {
      actionType: "create_node",
      nodeType: "Project",
      propertyKey: "subject_id",
      operation: "create",
      permissionType: "allow",
      valueConstraint: null,
      requiresHumanGate: false,
      status: "active",
    },
  );
}

describe("executeAction — subject_id tenancy", () => {
  it("거부: subject-scoped create without subjectId context", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "Project", title: "Acme homepage" },
      executorId: "agent-1",
      executorType: "Agent",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("SUBJECT_REQUIRED");
    }
  });

  it("통과: subjectId 주입 + create_node(Project) 커밋", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "Project", title: "Acme homepage" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_acme_42",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("committed");
    const nodes = await ports.graph.queryNodes({
      nodeType: "Project",
      subjectId: "usr_acme_42",
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.properties.subject_id).toBe("usr_acme_42");
  });

  it("거부: input subject_id가 context와 불일치", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_node",
      input: { nodeType: "Project", title: "X", subject_id: "usr_other" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_acme_42",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("SUBJECT_MISMATCH");
    }
  });

  it("거부: 다른 subject 노드 update", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    const node = createTestNode({
      nodeType: "Project",
      properties: { title: "Owned", subject_id: "usr_beta" },
    });
    state.nodes.set(node.id, node);
    state.actionCatalog.set("update_project_title", {
      actionType: "update_project_title",
      slug: toCatalogSlug("update_project_title"),
      label: toCatalogLabel("update_project_title"),
      scope: { kind: "node_type", nodeType: "Project" },
      preconditions: { requiresExistingNode: true, requiredFields: ["nodeId", "title"] },
      effects: [
        {
          kind: "update_node",
          nodeId: "",
          patch: { properties: {} },
        },
      ],
      executor: "Agent",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "update_project_title",
      input: { nodeId: node.id, title: "Hijacked" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_acme_42",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("SUBJECT_MISMATCH");
    }
  });

  it("query_nodes: subjectId 필터 격리", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    state.nodes.set(
      "a",
      createTestNode({
        id: "a",
        nodeType: "Project",
        properties: { subject_id: "usr_a" },
      }),
    );
    state.nodes.set(
      "b",
      createTestNode({
        id: "b",
        nodeType: "Project",
        properties: { subject_id: "usr_b" },
      }),
    );
    const ports = createInMemoryPorts(state);

    const aNodes = await ports.graph.queryNodes({ subjectId: "usr_a" });
    expect(aNodes).toHaveLength(1);
    expect(aNodes[0]?.id).toBe("a");
  });
});

const OTHER_PROJECT_ID = "00000000-0000-4000-8000-000000000099";

describe("executeAction — project_id tenancy", () => {
  it("거부: 다른 project 노드 update (scoped ports는 노드를 찾지 못함)", async () => {
    const state = createInMemoryState();
    seedSubjectScopedProjectCatalog(state);
    const node = createTestNode({
      nodeType: "Project",
      projectId: OTHER_PROJECT_ID,
      properties: { title: "Other project", subject_id: "usr_acme_42" },
    });
    state.nodes.set(node.id, node);
    state.actionCatalog.set("update_project_title", {
      actionType: "update_project_title",
      slug: toCatalogSlug("update_project_title"),
      label: toCatalogLabel("update_project_title"),
      scope: { kind: "node_type", nodeType: "Project" },
      preconditions: { requiresExistingNode: true, requiredFields: ["nodeId", "title"] },
      effects: [
        {
          kind: "update_node",
          nodeId: "",
          patch: { properties: {} },
        },
      ],
      executor: "Agent",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    });
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "update_project_title",
      input: { nodeId: node.id, title: "Hijacked" },
      executorId: "agent-1",
      executorType: "Agent",
      subjectId: "usr_acme_42",
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("PRECONDITION_FAILED");
    }
  });
});
