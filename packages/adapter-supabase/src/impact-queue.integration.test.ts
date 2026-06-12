import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb } from "./db/client.js";
import * as schema from "./db/schema.js";
import { createImpactQueuePort } from "./ports/index.js";

const connection = createDb();
const { db, client } = connection;

async function createTestProject() {
  const suffix = randomUUID().slice(0, 8);
  const orgRows = await db
    .insert(schema.organizations)
    .values({ slug: `impact-queue-${suffix}`, name: `Impact Queue ${suffix}` })
    .returning();
  const org = orgRows[0]!;
  const projectRows = await db
    .insert(schema.projects)
    .values({
      organizationId: org.id,
      slug: `project-${suffix}`,
      name: `Project ${suffix}`,
    })
    .returning();
  return { org, project: projectRows[0]! };
}

async function createActionLog(projectId: string) {
  const rows = await db
    .insert(schema.actionLog)
    .values({
      projectId,
      actionType: "update_mission",
      executorId: "agent-1",
      executorType: "Agent",
      input: {},
      effects: [],
      outcome: "committed",
      metadata: {},
    })
    .returning();
  return rows[0]!;
}

describe("impact queue adapter", () => {
  let projectId: string;
  let organizationId: string;
  let actionLogId: string;

  beforeAll(async () => {
    const { org, project } = await createTestProject();
    organizationId = org.id;
    projectId = project.id;
    actionLogId = (await createActionLog(projectId)).id;
  });

  afterAll(async () => {
    if (projectId) {
      await db
        .delete(schema.impactQueue)
        .where(eq(schema.impactQueue.projectId, projectId));
      await db.delete(schema.actionLog).where(eq(schema.actionLog.projectId, projectId));
      await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
    }
    if (organizationId) {
      await db
        .delete(schema.organizations)
        .where(eq(schema.organizations.id, organizationId));
    }
    await client.end();
  });

  it("deduplicates enqueue and claims by priority", async () => {
    const port = createImpactQueuePort(db, { projectId });
    const lower = await port.enqueueImpact({
      sourceActionLogId: actionLogId,
      workflowKey: "refresh-homepage-plan",
      priority: 1,
      idempotencyKey: "lower-priority",
    });
    const higher = await port.enqueueImpact({
      sourceActionLogId: actionLogId,
      workflowKey: "refresh-homepage-plan",
      priority: 100,
      idempotencyKey: "higher-priority",
    });
    const duplicate = await port.enqueueImpact({
      sourceActionLogId: actionLogId,
      workflowKey: "refresh-homepage-plan",
      priority: 100,
      idempotencyKey: "higher-priority",
    });

    const claimed = await port.claimImpactQueue({
      workerId: "worker-a",
      limit: 2,
      now: new Date(),
    });

    expect(duplicate.id).toBe(higher.id);
    expect(claimed.map((item) => item.id)).toEqual([higher.id, lower.id]);
    expect(claimed.every((item) => item.status === "running")).toBe(true);
    expect(claimed.every((item) => item.lockedBy === "worker-a")).toBe(true);
  });

  it("completes and dead-letters claimed work", async () => {
    const port = createImpactQueuePort(db, { projectId });
    const completeItem = await port.enqueueImpact({
      sourceActionLogId: actionLogId,
      workflowKey: "complete-work",
      idempotencyKey: "complete-work",
    });
    const deadItem = await port.enqueueImpact({
      sourceActionLogId: actionLogId,
      workflowKey: "dead-work",
      maxAttempts: 1,
      idempotencyKey: "dead-work",
    });

    await port.claimImpactQueue({ workerId: "worker-a", limit: 10 });
    const completed = await port.completeImpactQueue(completeItem.id, {
      logId: randomUUID(),
    });
    const failed = await port.failImpactQueue(deadItem.id, "boom");

    expect(completed?.status).toBe("succeeded");
    expect(completed?.completedAt).toBeInstanceOf(Date);
    expect(failed?.status).toBe("dead");
    expect(failed?.lastError).toBe("boom");
  });
});
