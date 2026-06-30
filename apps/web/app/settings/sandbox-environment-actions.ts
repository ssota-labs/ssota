"use server";

import { revalidatePath } from "next/cache";
import { UpsertSandboxEnvironmentInputSchema } from "@ssota/contracts";
import { getSandboxEnvironmentPort } from "@/lib/ports";
import { resolveOrg } from "@/lib/console/resolve-project";

export async function listSandboxEnvironmentsAction(
  orgSlug: string,
  teamspaceSlug: string,
) {
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const port = getSandboxEnvironmentPort(project.id);
  return port.listEnvironments();
}

export async function getSandboxEnvironmentAction(
  orgSlug: string,
  teamspaceSlug: string,
  environmentId: string,
) {
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const port = getSandboxEnvironmentPort(project.id);
  const environment = await port.getById(environmentId);
  if (!environment) return null;
  const sources = await port.listSources(environmentId);
  return { environment, sources };
}

export async function upsertSandboxEnvironmentAction(
  orgSlug: string,
  teamspaceSlug: string,
  input: unknown,
) {
  const parsed = UpsertSandboxEnvironmentInputSchema.parse(input);
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const port = getSandboxEnvironmentPort(project.id);
  const env = await port.upsertEnvironment(parsed);
  revalidatePath(`/${orgSlug}/${teamspaceSlug}/settings/sandbox-environments`);
  return env;
}

export async function deleteSandboxEnvironmentAction(
  orgSlug: string,
  teamspaceSlug: string,
  environmentId: string,
) {
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const port = getSandboxEnvironmentPort(project.id);
  await port.deleteById(environmentId);
  revalidatePath(`/${orgSlug}/${teamspaceSlug}/settings/sandbox-environments`);
}
