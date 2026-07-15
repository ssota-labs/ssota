/**
 * Map schedule `idempotencyPrefix` → SWDL cadence `triggerKey` for agent playbooks.
 * Direction skill picks weekly/quarterly/rebalance from `context.triggerKey`.
 */
const IDEMPOTENCY_PREFIX_TO_TRIGGER_KEY: Readonly<Record<string, string>> = {
  "swdl:direction:weekly-kpi": "weekly_kpi_review",
  "swdl:direction:quarterly": "quarterly_planning",
};

export function triggerKeyFromIdempotencyPrefix(
  prefix: string | null | undefined,
): string | undefined {
  if (!prefix) return undefined;
  return IDEMPOTENCY_PREFIX_TO_TRIGGER_KEY[prefix];
}

export function buildScheduledAgentTaskPayload(input: {
  agentName: string;
  scheduleId: string;
  idempotencyPrefix?: string | null;
  dateKey?: string;
}): {
  title: string;
  idempotencyKey: string;
  context: {
    triggerKey?: string;
    idempotencyPrefix?: string;
    scheduleId: string;
    executionDirective: {
      goal: string;
      background: string;
      steps: string[];
      constraints: string[];
      contextRefs: { nodeIds: string[]; edgeIds: string[]; taskIds: string[] };
    };
  };
} {
  const dateKey = input.dateKey ?? new Date().toISOString().slice(0, 10);
  const prefix = input.idempotencyPrefix?.trim() || undefined;
  const triggerKey = triggerKeyFromIdempotencyPrefix(prefix);
  const idempotencyKey = prefix
    ? `${prefix}:${dateKey}`
    : `schedule:${input.scheduleId}:${dateKey}`;

  return {
    title: triggerKey
      ? `Scheduled run: ${input.agentName} (${triggerKey})`
      : `Scheduled run: ${input.agentName}`,
    idempotencyKey,
    context: {
      ...(triggerKey ? { triggerKey } : {}),
      ...(prefix ? { idempotencyPrefix: prefix } : {}),
      scheduleId: input.scheduleId,
      executionDirective: {
        goal: triggerKey
          ? `Execute scheduled ${triggerKey} for ${input.agentName}`
          : `Execute scheduled agent ${input.agentName}`,
        background: triggerKey
          ? `Triggered by schedule fan-out (triggerKey=${triggerKey})`
          : "Triggered by schedule fan-out",
        steps: [
          "Read context.triggerKey / idempotencyPrefix",
          "Load matching playbook",
          "Execute task",
          "Report completion",
        ],
        constraints: [],
        contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
      },
    },
  };
}
