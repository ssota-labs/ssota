import type { GoalHealthStatus } from "@ssota/contracts";

export function parseMetricValue(
  value: unknown,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/%$/, "");
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function computeProgress(input: {
  baseline: number | null;
  current: number | null;
  target: number | null;
  direction?: string;
}): number | null {
  const { baseline, current, target, direction = "increase" } = input;
  if (current === null) return null;

  if (direction === "maintain") {
    return 100;
  }

  if (baseline === null || target === null) return null;
  if (target === baseline) return current === target ? 100 : null;

  if (direction === "decrease") {
    const span = baseline - target;
    if (span === 0) return null;
    const raw = ((baseline - current) / span) * 100;
    return clampProgress(raw);
  }

  const span = target - baseline;
  if (span === 0) return null;
  const raw = ((current - baseline) / span) * 100;
  return clampProgress(raw);
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeKeyResultHealth(input: {
  baseline: number | null;
  current: number | null;
  target: number | null;
  direction?: string;
  dueAt?: string;
  explicitStatus?: string;
}): GoalHealthStatus {
  if (input.explicitStatus && isGoalHealthStatus(input.explicitStatus)) {
    return input.explicitStatus;
  }

  if (input.baseline === null && input.current === null) {
    return "baseline_pending";
  }

  const progress = computeProgress(input);
  if (progress === null) return "baseline_pending";
  if (progress >= 100) return "achieved";

  if (input.dueAt) {
    const due = new Date(input.dueAt).getTime();
    if (!Number.isNaN(due) && Date.now() > due && progress < 100) {
      return progress >= 50 ? "partial" : "at_risk";
    }
  }

  if (progress < 50) return "at_risk";
  return "on_track";
}

export function aggregateObjectiveHealth(
  keyResults: { status: GoalHealthStatus; progress: number | null }[],
): { status: GoalHealthStatus; progress: number | null } {
  if (keyResults.length === 0) {
    return { status: "draft", progress: null };
  }

  const progresses = keyResults
    .map((kr) => kr.progress)
    .filter((p): p is number => p !== null);
  const progress =
    progresses.length > 0
      ? Math.round(
          progresses.reduce((sum, value) => sum + value, 0) / progresses.length,
        )
      : null;

  const statuses = keyResults.map((kr) => kr.status);
  if (statuses.every((s) => s === "achieved")) {
    return { status: "achieved", progress: progress ?? 100 };
  }
  if (statuses.some((s) => s === "at_risk")) {
    return { status: "at_risk", progress };
  }
  if (statuses.some((s) => s === "baseline_pending")) {
    return { status: "baseline_pending", progress };
  }
  return { status: "on_track", progress };
}

export function summarizeGoalsHealth(input: {
  objectives: { status: GoalHealthStatus; progress: number | null }[];
  keyResults: { status: GoalHealthStatus }[];
  kpis: unknown[];
}): {
  atRiskCount: number;
  achievedCount: number;
  periodProgress: number | null;
} {
  const atRiskCount = input.keyResults.filter((kr) => kr.status === "at_risk").length;
  const achievedCount = input.objectives.filter((o) => o.status === "achieved").length;
  const progresses = input.objectives
    .map((o) => o.progress)
    .filter((p): p is number => p !== null);
  const periodProgress =
    progresses.length > 0
      ? Math.round(progresses.reduce((sum, v) => sum + v, 0) / progresses.length)
      : null;

  return { atRiskCount, achievedCount, periodProgress };
}

function isGoalHealthStatus(value: string): value is GoalHealthStatus {
  return [
    "draft",
    "on_track",
    "at_risk",
    "achieved",
    "partial",
    "missed",
    "baseline_pending",
  ].includes(value);
}
