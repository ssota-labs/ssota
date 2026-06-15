"use server";

import { createNode } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { createContributesToEdge } from "@/lib/graph/actions/create-goal-edges";
import { getCurrentUser } from "@/lib/supabase/server";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

export async function createObjectiveBundleAction(input: {
  projectId: string;
  title: string;
  period?: string;
  priority?: "high" | "medium" | "low";
  keyResults?: Array<{
    title: string;
    baseline?: number;
    target?: number;
    unit?: string;
    direction?: "increase" | "decrease" | "maintain";
  }>;
  revalidatePaths?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const deps = getGraphDeps(input.projectId);
  const objective = await createNode(deps, {
    projectId: input.projectId,
    nodeType: "objective",
    title: input.title,
    properties: {
      period: input.period,
      priority: input.priority ?? "medium",
      status: "draft",
    },
  });

  for (const kr of input.keyResults ?? []) {
    const keyResult = await createNode(deps, {
      projectId: input.projectId,
      nodeType: "key_result",
      title: kr.title,
      properties: {
        baseline: kr.baseline,
        target: kr.target,
        unit: kr.unit,
        direction: kr.direction ?? "increase",
        status: "baseline_pending",
      },
    });
    await createContributesToEdge({
      projectId: input.projectId,
      keyResultId: keyResult.id,
      objectiveId: objective.id,
    });
  }

  revalidateConsole(input.revalidatePaths ?? []);
  return objective;
}
