import type { CreateNodeInput } from "@ssota/contracts/graph";
import type { RoadmapKind, RoadmapQuarter } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

function asRoadmapYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asRoadmapQuarter(value: unknown): RoadmapQuarter | undefined {
  const parsed = asRoadmapYear(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) {
    return parsed;
  }
  return undefined;
}

function roadmapIdentity(properties: Record<string, unknown>) {
  return {
    kind:
      typeof properties.kind === "string"
        ? (properties.kind as RoadmapKind)
        : undefined,
    year: asRoadmapYear(properties.year),
    quarter: asRoadmapQuarter(properties.quarter),
  };
}

export async function assertRoadmapCreateAllowed(
  graphRead: GraphReadPort,
  input: CreateNodeInput & { catalogKey?: string },
) {
  const catalogKey = input.catalogKey;
  if (catalogKey !== "roadmap") return;

  const { kind, year, quarter } = roadmapIdentity(input.properties ?? {});
  if (!kind || year == null) {
    throw new GraphError(
      "VALIDATION_FAILED",
      "roadmap requires kind and year in properties",
    );
  }

  const existing = await graphRead.queryNodes({
    projectId: input.projectId,
    catalogKey: "roadmap",
    limit: 200,
  });

  const duplicate = existing.find((node) => {
    const identity = roadmapIdentity(node.properties);
    if (identity.kind !== kind || identity.year !== year) return false;
    if (kind === "annual") return true;
    return identity.quarter === quarter;
  });

  if (duplicate) {
    throw new GraphError(
      "PRECONDITION_FAILED",
      `A ${kind} roadmap already exists for ${year}${quarter != null ? ` Q${quarter}` : ""}`,
    );
  }
}
