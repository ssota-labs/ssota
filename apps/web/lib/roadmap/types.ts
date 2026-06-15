import type { RoadmapKind, RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";

export type RoadmapNodeView = {
  id: string;
  title: string;
  content: string;
  docStatus?: DocStatus;
  kind?: RoadmapKind;
  year?: number;
  quarter?: RoadmapQuarter;
  parentRoadmapId?: string;
};

export type PlanningPeriod = "annual" | RoadmapQuarter;
