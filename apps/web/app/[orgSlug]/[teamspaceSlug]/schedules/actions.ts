"use server";

import { revalidatePath } from "next/cache";
import { WorkerSyncConfigSchema } from "@ssota/contracts";
import { getWorkerPort } from "@/lib/ports";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";

export async function toggleSyncWorkerEnabledAction(input: {
  orgSlug: string;
  teamspaceSlug: string;
  teamspaceId: string;
  workerId: string;
  enabled: boolean;
}) {
  const port = getWorkerPort(input.teamspaceId);
  const worker = await port.getById(input.workerId);
  if (!worker || worker.kind !== "sync") {
    throw new Error("Sync worker not found");
  }

  const parsed = WorkerSyncConfigSchema.safeParse(worker.kindConfig);
  if (!parsed.success) {
    throw new Error("Sync worker has invalid schedule config");
  }
  await port.updateWorker(input.workerId, {
    kindConfig: {
      ...parsed.data,
      enabled: input.enabled,
    },
  });

  revalidatePath(
    legacyOrgTeamspacePath(
      { orgSlug: input.orgSlug, teamspaceSlug: input.teamspaceSlug },
      "schedules",
    ),
  );
}
