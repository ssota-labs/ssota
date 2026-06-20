import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  createConsolePort,
} from "@ssota/adapter-supabase";
import { spawnTask } from "@ssota/core";
import { runAgentForTask } from "../run.js";
import { getDb, getGraphReadPort, getTaskPort } from "../ports.js";

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
