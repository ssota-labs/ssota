import { getAgentDefinitionById } from "@ssota/contracts/agents";
import { getAgentDefinitionPort, getSchedulePort } from "@/lib/ports";

/**
 * S4 — schedule (cron cadence) authoring over MCP. A schedule fires an agent
 * run on its cron in `timezone`; the runtime heartbeat (UTC) evaluates each
 * schedule's window in its zone. Builder scope (no accountId). Mirrors the
 * platform's schedule hub over the SchedulePort.
 */

const CRON_FIELDS = /^(\S+\s+){4,5}\S+$/; // 5 or 6 space-separated fields

export async function createScheduleForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const agentDefinitionId = String(input.agentDefinitionId);
  // A schedule against a non-existent agent never fires — validate up front.
  const exists =
    (await getAgentDefinitionPort(teamspaceId).getById(agentDefinitionId)) ??
    getAgentDefinitionById(agentDefinitionId);
  if (!exists) {
    throw new Error(
      `Unknown agentDefinitionId '${agentDefinitionId}' — create the agent with create_agent first.`,
    );
  }
  const cronExpression = String(input.cronExpression ?? "").trim();
  if (!CRON_FIELDS.test(cronExpression)) {
    throw new Error(
      `Invalid cronExpression '${cronExpression}' — expected 5 or 6 space-separated fields (e.g. "0 9 * * *").`,
    );
  }
  const schedule = await getSchedulePort(teamspaceId).create({
    agentDefinitionId,
    cronExpression,
    timezone: (input.timezone as string | undefined) ?? "Asia/Seoul",
    enabled: input.enabled as boolean | undefined,
    idempotencyPrefix: input.idempotencyPrefix as string | undefined,
  });
  return schedule;
}

export async function listSchedulesForMcp(teamspaceId: string) {
  return getSchedulePort(teamspaceId).list();
}
