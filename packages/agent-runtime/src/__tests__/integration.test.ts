import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  createConsolePort,
} from "@ssota/adapter-supabase";
import {
  createNode,
  readPageDefinitionByRouteKey,
  resolvePageBindings,
  spawnTask,
  writePageDefinition,
} from "@ssota/core";
import { createNodeInputSchema } from "@ssota/contracts/graph";
import { runAgentForTask } from "../run.js";
import { getDb, getGraphPorts, getGraphReadPort, getTaskPort } from "../ports.js";

const DB_ONLY = Boolean(process.env.DATABASE_URL);

async function defaultProjectId(): Promise<string> {
  const console_ = createConsolePort(getDb());
  const org = await console_.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  const project = org
    ? await console_.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG)
    : null;
  if (!project) throw new Error("seed missing — run pnpm db:seed");
  return project.id;
}

/**
 * Live end-to-end run of the agent loop against a real DB + AI Gateway.
 * Skipped unless both DATABASE_URL and AI_GATEWAY_API_KEY are set — start
 * local Supabase (`pnpm e2e:prepare`) and export the gateway key to run it:
 *
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *   AI_GATEWAY_API_KEY=... \
 *   pnpm --filter @ssota/agent-runtime test
 */
const SHOULD_RUN =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.AI_GATEWAY_API_KEY);

describe.skipIf(!SHOULD_RUN)("agent runtime live integration", () => {
  it(
    "runs an Agent task to a terminal status",
    async () => {
      const db = getDb();
      const console_ = createConsolePort(db);
      const org = await console_.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      expect(org, "seeded organization").toBeTruthy();
      const project = await console_.getProjectBySlug(
        org!.id,
        DEFAULT_PROJECT_SLUG,
      );
      expect(project, "seeded project").toBeTruthy();
      const projectId = project!.id;

      const task = await spawnTask(
        {
          tasks: getTaskPort(projectId),
          graphRead: getGraphReadPort(projectId),
        },
        projectId,
        {
          title: "Integration smoke: summarize the current project's goals",
          workflowKey: "work.write_document",
          executorType: "Agent",
          acceptanceCriteria: [
            "List the project's objectives (or note none exist)",
          ],
          idempotencyKey: `agent-runtime-integration-${Date.now()}`,
        },
      );

      const result = await runAgentForTask({
        projectId,
        taskId: task.id,
        runId: `test-${task.id}`,
      });

      expect(["done", "blocked"]).toContain(result.finalStatus);
    },
    180_000,
  );
});

// Deterministic (no LLM): persist a page definition on a `page` node and
// resolve its bindings against the live graph — the Phase 3 pipeline that
// backs the production render route. Needs only DATABASE_URL.
describe.skipIf(!DB_ONLY)("page definition pipeline", () => {
  it("persists a definition and resolves its bindings", async () => {
    const projectId = await defaultProjectId();
    const ports = getGraphPorts(projectId);

    const pageNode = await createNode(
      ports,
      createNodeInputSchema.parse({
        projectId,
        catalogKey: "page",
        title: "Agent Dashboard",
        properties: {},
      }),
    );

    const routeKey = `agent-dash-${pageNode.id.slice(0, 8)}`;
    const definition = {
      routeKey,
      scope: "project" as const,
      spec: {
        root: "header",
        elements: {
          header: {
            type: "PageHeader",
            props: { title: "Agent Dashboard", subtitle: "Owned by the agent" },
          },
          list: { type: "NodeList", props: { binding: "objectives" } },
        },
      },
      bindings: {
        objectives: { kind: "query" as const, catalogKey: "objective" },
      },
    };

    await writePageDefinition(ports, {
      projectId,
      nodeId: pageNode.id,
      definition,
    });

    const read = await readPageDefinitionByRouteKey(
      getGraphReadPort(projectId),
      projectId,
      routeKey,
    );
    expect(read?.nodeId).toBe(pageNode.id);
    expect(read?.definition.routeKey).toBe(routeKey);

    const data = await resolvePageBindings(
      getGraphReadPort(projectId),
      projectId,
      read!.definition.bindings,
    );
    expect(Array.isArray(data.objectives)).toBe(true);
  });
});
