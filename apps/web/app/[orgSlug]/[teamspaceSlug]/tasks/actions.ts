"use server";

import {
  SpawnTaskInputSchema,
  UpdateTaskInputSchema,
  type TaskStatus,
} from "@ssota/contracts";
import { spawnTask } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAgentDefinitionPort, getGraphPorts, getTaskPort } from "@/lib/ports";

export async function updateTaskStatusAction(
  teamspaceId: string,
  taskId: string,
  status: TaskStatus,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpdateTaskInputSchema.parse({ taskId, status });
  const result = await getTaskPort(teamspaceId).updateTask(parsed.taskId, {
    status: parsed.status,
  });

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
  return result;
}

export async function spawnTaskAction(
  teamspaceId: string,
  input: {
    title: string;
    agentDefinitionId: string;
    assignee?: string;
    executorType?: "Agent" | "Human" | "System";
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = SpawnTaskInputSchema.parse({
    title: input.title,
    agentDefinitionId: input.agentDefinitionId,
    assignee: input.assignee,
    executorType: input.executorType,
    acceptanceCriteria: ["Complete the work described in the task title and context"],
    context: {
      executionDirective: {
        goal:
          input.title.length >= 10
            ? input.title
            : `Complete task: ${input.title}`,
        background: "Created from Console tasks UI for human or agent execution.",
        steps: [
          "Review task title and acceptance criteria",
          "Complete the requested work",
          "Update task status and result when done",
        ],
        constraints: [],
        contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
      },
    },
  });
  const graphPorts = await getGraphPorts(teamspaceId);
  await spawnTask(
    {
      tasks: getTaskPort(teamspaceId),
      graphRead: graphPorts.graphRead,
      agentDefinitions: getAgentDefinitionPort(teamspaceId),
    },
    teamspaceId,
    parsed,
  );

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
}
