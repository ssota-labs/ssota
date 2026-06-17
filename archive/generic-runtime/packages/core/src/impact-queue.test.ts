import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { projectImpactQueueItems } from "./impact-queue.js";
import type { ActionLogRecord, Edge } from "./domain/types.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  createTestNode,
  TEST_PROJECT_ID,
} from "./testing/in-memory.js";

function createCommittedUpdateLog(nodeId: string): ActionLogRecord {
  return {
    id: randomUUID(),
    projectId: TEST_PROJECT_ID,
    actionType: "update_mission",
    executorId: "agent-1",
    executorType: "Agent",
    input: { nodeId },
    effects: [
      {
        kind: "update_node",
        nodeId,
        patch: { content: "Updated mission" },
      },
    ],
    outcome: "committed",
    rejectionReason: null,
    gateId: null,
    idempotencyKey: null,
    metadata: {},
    createdAt: new Date(),
  };
}

describe("impact queue projection", () => {
  it("projects committed node changes through dependency edges", async () => {
    const source = createTestNode({ nodeType: "Mission" });
    const target = createTestNode({ nodeType: "HomepagePlan" });
    const edge: Edge = {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      edgeType: "influences",
      sourceNodeId: source.id,
      targetNodeId: target.id,
      properties: {},
      createdAt: new Date(),
    };
    const state = createInMemoryState({ nodes: [source, target] });
    state.edges.set(edge.id, edge);
    const ports = createInMemoryPorts(state);

    const items = await projectImpactQueueItems({
      actionLog: createCommittedUpdateLog(source.id),
      graph: ports.graph,
      rules: [
        {
          workflowKey: "refresh-homepage-plan",
          direction: "outgoing",
          edgeTypes: ["influences"],
          targetNodeTypes: ["HomepagePlan"],
          priority: 10,
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceNodeId: source.id,
      targetNodeId: target.id,
      dependencyEdgeId: edge.id,
      workflowKey: "refresh-homepage-plan",
      priority: 10,
    });
  });

  it("does not project rejected action logs", async () => {
    const source = createTestNode({ nodeType: "Mission" });
    const state = createInMemoryState({ nodes: [source] });
    const ports = createInMemoryPorts(state);
    const actionLog = { ...createCommittedUpdateLog(source.id), outcome: "rejected" as const };

    const items = await projectImpactQueueItems({
      actionLog,
      graph: ports.graph,
      rules: [{ workflowKey: "refresh-homepage-plan" }],
    });

    expect(items).toEqual([]);
  });
});

describe("impact queue port", () => {
  it("deduplicates enqueue by idempotency key", async () => {
    const state = createInMemoryState();
    const ports = createInMemoryPorts(state);
    const input = {
      sourceActionLogId: randomUUID(),
      workflowKey: "refresh-homepage-plan",
      idempotencyKey: "log-1:edge-1:target-1:refresh-homepage-plan",
    };

    const first = await ports.impactQueue.enqueueImpact(input);
    const second = await ports.impactQueue.enqueueImpact(input);

    expect(second.id).toBe(first.id);
    expect(state.impactQueue.size).toBe(1);
  });

  it("claims available work and recovers expired locks", async () => {
    const state = createInMemoryState();
    const ports = createInMemoryPorts(state);
    const baseTime = new Date("2026-06-12T00:00:00.000Z");
    const item = await ports.impactQueue.enqueueImpact({
      sourceActionLogId: randomUUID(),
      workflowKey: "refresh-homepage-plan",
      idempotencyKey: "claimable",
      runAt: baseTime,
    });

    const firstClaim = await ports.impactQueue.claimImpactQueue({
      workerId: "worker-a",
      now: baseTime,
      lockMs: 1_000,
    });
    const blockedClaim = await ports.impactQueue.claimImpactQueue({
      workerId: "worker-b",
      now: new Date(baseTime.getTime() + 500),
    });
    const reclaimed = await ports.impactQueue.claimImpactQueue({
      workerId: "worker-b",
      now: new Date(baseTime.getTime() + 1_001),
    });

    expect(firstClaim.map((claimed) => claimed.id)).toEqual([item.id]);
    expect(blockedClaim).toEqual([]);
    expect(reclaimed.map((claimed) => claimed.lockedBy)).toEqual(["worker-b"]);
    expect(reclaimed[0]?.attemptCount).toBe(2);
  });

  it("marks failed work as retryable before max attempts and dead after", async () => {
    const state = createInMemoryState();
    const ports = createInMemoryPorts(state);
    const item = await ports.impactQueue.enqueueImpact({
      sourceActionLogId: randomUUID(),
      workflowKey: "refresh-homepage-plan",
      idempotencyKey: "retryable",
      maxAttempts: 1,
    });

    await ports.impactQueue.claimImpactQueue({ workerId: "worker-a" });
    const failed = await ports.impactQueue.failImpactQueue(item.id, "boom");

    expect(failed?.status).toBe("dead");
    expect(failed?.lastError).toBe("boom");
    expect(failed?.completedAt).toBeInstanceOf(Date);
  });
});
