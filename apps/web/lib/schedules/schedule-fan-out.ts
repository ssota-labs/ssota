import { start } from "workflow/api";
import { and, eq } from "drizzle-orm";
import type { ScheduleTargetType } from "@ssota/contracts";
import type { Db } from "@ssota/adapter-postgres";
import { schema } from "@ssota/adapter-postgres";
import { spawnTask } from "@ssota/core";
import { runMainWorkflowAgent } from "@/app/workflows/main-workflow-agent";
import { runTaskAgentWorkflow } from "@/app/workflows/task-agent";
import { getTaskPort, getAgentDefinitionPort } from "@/lib/ports";

export interface ScheduleRow {
  id: string;
  teamspaceId: string;
  accountId: string | null;
  agentDefinitionId: string;
  targetType: ScheduleTargetType;
}

/**
 * Fan out a due schedule to the correct agent runtime. Scheduler does not call
 * the model directly — it only starts Main Agent, Specialist task, or ready
 * task dispatch workflows.
 */
export async function fanOutSchedule(
  db: Db,
  schedule: ScheduleRow,
): Promise<string | null> {
  const accountId = schedule.accountId ?? undefined;

  switch (schedule.targetType) {
    case "main_heartbeat": {
      const run = await start(runMainWorkflowAgent, [
        {
          teamspaceId: schedule.teamspaceId,
          threadId: "",
          accountId,
          scheduleId: schedule.id,
          chatContext: {
            trigger: "heartbeat",
            scheduleId: schedule.id,
          },
        },
      ]);
      return run.runId;
    }
    case "agent": {
      const agentPort = getAgentDefinitionPort(schedule.teamspaceId);
      const definition = await agentPort.getById(schedule.agentDefinitionId);
      if (!definition) return null;

      const task = await spawnTask(
        {
          tasks: getTaskPort(schedule.teamspaceId, accountId),
          agentDefinitions: agentPort,
        },
        schedule.teamspaceId,
        {
          title: `Scheduled run: ${definition.name}`,
          agentDefinitionId: definition.id,
          status: "ready",
          executorType: "Agent",
          idempotencyKey: `schedule:${schedule.id}:${new Date().toISOString().slice(0, 10)}`,
          context: {
            executionDirective: {
              goal: `Execute scheduled agent ${definition.name}`,
              background: "Triggered by schedule fan-out",
              steps: ["Load agent playbook", "Execute task", "Report completion"],
              constraints: [],
              contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
            },
          },
          acceptanceCriteria: [
            { description: "Scheduled agent run completed" },
          ],
        },
      );

      const run = await start(runTaskAgentWorkflow, [
        {
          teamspaceId: schedule.teamspaceId,
          taskId: task.id,
          accountId,
          scheduleId: schedule.id,
        },
      ]);
      return run.runId;
    }
    case "ready_task_dispatch": {
      const tasks = await getTaskPort(schedule.teamspaceId, accountId).queryTasks({
        status: "ready",
        executorType: "Agent",
        limit: 5,
      });
      if (tasks.length === 0) return null;
      const run = await start(runTaskAgentWorkflow, [
        {
          teamspaceId: schedule.teamspaceId,
          taskId: tasks[0]!.id,
          accountId,
          scheduleId: schedule.id,
        },
      ]);
      return run.runId;
    }
    default:
      return null;
  }
}

export async function loadScheduleWithDefinition(
  db: Db,
  scheduleId: string,
): Promise<ScheduleRow | null> {
  const rows = await db
    .select({
      id: schema.schedules.id,
      teamspaceId: schema.schedules.teamspaceId,
      accountId: schema.schedules.accountId,
      agentDefinitionId: schema.schedules.agentDefinitionId,
      targetType: schema.schedules.targetType,
    })
    .from(schema.schedules)
    .where(eq(schema.schedules.id, scheduleId))
    .limit(1);
  return rows[0] ?? null;
}
