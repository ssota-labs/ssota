import type { RoadmapKind, RoadmapQuarter } from "@ssota/contracts";

export function parseRoadmapYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function parseRoadmapQuarter(value: unknown): RoadmapQuarter | undefined {
  const parsed = parseRoadmapYear(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) {
    return parsed;
  }
  return undefined;
}

export function parseRoadmapKind(value: unknown): RoadmapKind | undefined {
  if (value === "annual" || value === "quarter") return value;
  return undefined;
}
