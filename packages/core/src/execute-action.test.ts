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
