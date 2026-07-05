"use server";

import { revalidatePath } from "next/cache";
import type { CreateWorkerInput, UpdateWorkerInput } from "@ssota/contracts";
import { executeScopedWorker } from "@/lib/workers/execute-scoped-worker";
import { getWorkerPort } from "@/lib/ports";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";

function revalidateWorkers(orgSlug: string, teamspaceSlug: string) {
  revalidatePath(
    legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "workers"),
  );
}

export async function getWorkerAction(teamspaceId: string, workerId: string) {
  const port = getWorkerPort(teamspaceId);
  return port.getById(workerId);
}

export async function createWorkerAction(
  orgSlug: string,
  teamspaceSlug: string,
  teamspaceId: string,
  input: CreateWorkerInput,
) {
  const port = getWorkerPort(teamspaceId);
  const worker = await port.createWorker(input);
  revalidateWorkers(orgSlug, teamspaceSlug);
  return worker;
}

export async function updateWorkerAction(
  orgSlug: string,
  teamspaceSlug: string,
  teamspaceId: string,
  workerId: string,
  patch: UpdateWorkerInput,
) {
  const port = getWorkerPort(teamspaceId);
  const worker = await port.updateWorker(workerId, patch);
  revalidateWorkers(orgSlug, teamspaceSlug);
  return worker;
}

export async function deleteWorkerAction(
  orgSlug: string,
  teamspaceSlug: string,
  teamspaceId: string,
  workerId: string,
) {
  const port = getWorkerPort(teamspaceId);
  await port.deleteWorker(workerId);
  revalidateWorkers(orgSlug, teamspaceSlug);
}

export async function dryRunWorkerAction(
  teamspaceId: string,
  workerId: string,
  input: Record<string, unknown> = {},
) {
  const port = getWorkerPort(teamspaceId);
  const worker = await port.getById(workerId);
  if (!worker) throw new Error("Worker not found");
  return executeScopedWorker({ worker, input, dryRun: true, trigger: "manual" });
}
