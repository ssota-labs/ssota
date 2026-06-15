import type { CreateNodeInput } from "@ssota/contracts/graph";
import type { RoadmapKind, RoadmapQuarter } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

function roadmapIdentity(properties: Record<string, unknown>) {
  return {
    kind: properties.kind as RoadmapKind | undefined,
    year: properties.year as number | undefined,
    quarter: properties.quarter as RoadmapQuarter | undefined,
  };
}

export async function assertRoadmapCreateAllowed(
  graphRead: GraphReadPort,
  input: CreateNodeInput,
) {
  if (input.nodeType !== "roadmap") return;

  const { kind, year, quarter } = roadmapIdentity(input.properties ?? {});
  if (!kind || year == null) {
    throw new GraphError(
      "VALIDATION_FAILED",
      "roadmap requires kind and year in properties",
    );
  }

  const existing = await graphRead.queryNodes({
    projectId: input.projectId,
    nodeType: "roadmap",
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
