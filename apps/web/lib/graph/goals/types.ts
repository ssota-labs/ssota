import type { GoalHealthStatus } from "@ssota/contracts";

export type GoalKpiRow = {
  id: string;
  title: string;
  baseline?: number;
  target?: number;
  current?: number;
  unit?: string;
  cadence?: string;
  direction?: string;
  status?: string;
  delta?: number;
};

export type GoalKeyResultRow = {
  id: string;
  title: string;
  metricName?: string;
  baseline?: number;
  current?: number;
  target?: number;
  unit?: string;
  direction?: string;
  status: GoalHealthStatus;
  progress: number | null;
  dueAt?: string;
  measuredByKpiId?: string;
};

export type GoalObjectiveRow = {
  id: string;
  title: string;
  period?: string;
  priority?: string;
  status: GoalHealthStatus;
  progress: number | null;
  audience?: string;
  roadmapTheme?: string;
  keyResults: GoalKeyResultRow[];
  trackedKpis: GoalKpiRow[];
};

export type GoalsSummary = {
  objectiveCount: number;
  keyResultCount: number;
  kpiCount: number;
  atRiskCount: number;
  achievedCount: number;
  periodProgress: number | null;
};

export type GoalsDashboardDTO = {
  summary: GoalsSummary;
  periodOptions: string[];
  roadmapContext?: {
    id: string;
    title: string;
    theme?: string;
    period?: string;
  };
  objectives: GoalObjectiveRow[];
  unlinkedKeyResults: GoalKeyResultRow[];
  unlinkedKpis: GoalKpiRow[];
  kpiPulse: GoalKpiRow[];
};
