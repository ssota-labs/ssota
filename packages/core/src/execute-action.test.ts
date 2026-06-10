import { describe, expect, it } from "vitest";
import { executeAction } from "./index.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  createTestNode,
  seedTestCatalog,
} from "./testing/in-memory.js";
import type { ActionLogRecord } from "./domain/types.js";

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
      actionType: "create_note",
      input: {},
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("PRECONDITION_FAILED");
    }
  });

  it("통과: create_note 커밋 + 로그", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "create_note",
      input: { content: "Hello LoopOS" },
      executorId: "agent-1",
      executorType: "Agent",
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
    state.permissions.push({
      actionType: "create_note",
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
      actionType: "create_note",
      input: { content: "x", properties: { secret: "no" } },
      executorId: "agent-1",
      executorType: "Agent",
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
      actionType: "create_note",
      input: { content: "Once" },
      executorId: "agent-1",
      executorType: "Agent" as const,
      idempotencyKey: "key-123",
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
      actionType: "create_note",
      input: { content: "Logged" },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(state.actionLog.length).toBe(1);
    expect(state.actionLog[0]?.actionType).toBe("create_note");
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
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("INVALID_LIFECYCLE_TRANSITIONS");
    }
  });

  it("게이트: Agent executor define_node_type", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    const ports = createInMemoryPorts(state);

    const result = await executeAction(ports, {
      actionType: "define_node_type",
      input: { definition: validDefinition },
      executorId: "agent-1",
      executorType: "Agent",
    });

    expect(result.status).toBe("gated");
    expect(state.nodeCatalog.has("Memo")).toBe(false);
    if (result.status === "gated") {
      expect(state.gates.has(result.gateId)).toBe(true);
    }
  });
});

describe("executeAction — follow-up catalog meta actions", () => {
  it("게이트: breaking update_node_type lifecycle change", async () => {
    const state = createInMemoryState();
    seedTestCatalog(state);
    state.actionCatalog.set("update_node_type", {
      actionType: "update_node_type",
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
    });

    expect(result.status).toBe("gated");
  });

  it("거부: deprecate_node_type when nodes exist", async () => {
    const node = createTestNode();
    const state = createInMemoryState({ nodes: [node] });
    seedTestCatalog(state);
    state.actionCatalog.set("deprecate_node_type", {
      actionType: "deprecate_node_type",
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
      preconditions: { requiredFields: ["definition"] },
      effects: [{ kind: "upsert_action_catalog_entry", entry: { actionType: "", preconditions: {}, effects: [], executor: "Agent", allowedLifecycleTransitions: {}, failureMode: "reject", logPayloadSchema: {} } }],
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
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("UNSAFE_EFFECT");
    }
  });
});
