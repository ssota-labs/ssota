import type { AgentTrigger } from "@ssota/contracts";

/** /api/agent-runs가 반환하는 런 행 (Date는 JSON 직렬화로 string). */
export interface AgentRunRow {
  id: string;
  teamspaceId: string;
  accountId: string | null;
  runtimeKind: string;
  agentDefinitionId: string | null;
  trigger: AgentTrigger | null;
  taskId: string | null;
  threadId: string | null;
  scheduleId: string | null;
  workflowRunId: string;
  status: string;
  model: string | null;
  usage: Record<string, unknown>;
  startedAt: string;
  finishedAt: string | null;
}

export const TRIGGER_BADGE_LABELS: Record<AgentTrigger, string> = {
  chat: "Chat",
  chatbot: "Chatbot",
  task: "Task",
  schedule: "Schedule",
  heartbeat: "Heartbeat",
  manual: "Manual",
  gate_resume: "Gate resume",
};

export function runStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed" || status === "cancelled") return "destructive";
  if (status === "running") return "default";
  return "secondary";
}

export function runDurationLabel(run: AgentRunRow): string | null {
  if (!run.finishedAt) return null;
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function runTokensLabel(run: AgentRunRow): string | null {
  const total = run.usage?.totalTokens;
  if (typeof total !== "number" || total <= 0) return null;
  return `${total.toLocaleString()} tokens`;
}
