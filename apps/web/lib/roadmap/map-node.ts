import type { GraphNode } from "@ssota/core";
import type { RoadmapKind, RoadmapQuarter } from "@ssota/contracts";
import { parseDocStatus } from "@/lib/roadmap/doc-status";
import type { RoadmapNodeView } from "@/lib/roadmap/types";

export function toRoadmapNodeView(node: GraphNode): RoadmapNodeView {
  const properties = node.properties ?? {};
  return {
    id: node.id,
    title: node.title || "",
    content: node.content ?? "",
    docStatus: parseDocStatus(properties.doc_status),
    kind: typeof properties.kind === "string" ? (properties.kind as RoadmapKind) : undefined,
    year: typeof properties.year === "number" ? properties.year : undefined,
    quarter:
      typeof properties.quarter === "number"
        ? (properties.quarter as RoadmapQuarter)
        : undefined,
    parentRoadmapId:
      typeof properties.parent_roadmap_id === "string"
        ? properties.parent_roadmap_id
        : undefined,
  };
}

export function sortPlanningRoadmaps(nodes: RoadmapNodeView[]): RoadmapNodeView[] {
  return [...nodes].sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    if (a.kind === "annual" && b.kind !== "annual") return -1;
    if (a.kind !== "annual" && b.kind === "annual") return 1;
    return (a.quarter ?? 0) - (b.quarter ?? 0);
  });
}
