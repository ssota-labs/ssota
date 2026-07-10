"use client";

import * as React from "react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { WorkCycleDiagram } from "@/components/console/work-cycle-diagram";
import type {
  GatePolicyInstance,
  WorkCycleInstance,
} from "@/components/console/work-cycle-model";
import { gatePolicyPropertiesSchema, workCyclePropertiesSchema } from "@ssota/contracts";

type RawNode = {
  id: string;
  title: string;
  properties: Record<string, unknown>;
};

function parseCycles(raw: RawNode[]): WorkCycleInstance[] {
  const out: WorkCycleInstance[] = [];
  for (const row of raw) {
    const parsed = workCyclePropertiesSchema.safeParse(row.properties);
    if (!parsed.success) continue;
    out.push({ id: row.id, title: row.title, properties: parsed.data });
  }
  return out;
}

function parsePolicies(raw: RawNode[]): GatePolicyInstance[] {
  const out: GatePolicyInstance[] = [];
  for (const row of raw) {
    const parsed = gatePolicyPropertiesSchema.safeParse(row.properties);
    if (!parsed.success) continue;
    out.push({ id: row.id, title: row.title, properties: parsed.data });
  }
  return out;
}

type WorkCycleWorkspaceProps = {
  teamspaceId: string;
  cycleNodes: RawNode[];
  policyNodes: RawNode[];
};

export function WorkCycleWorkspace({
  teamspaceId,
  cycleNodes,
  policyNodes,
}: WorkCycleWorkspaceProps) {
  const cycles = React.useMemo(() => {
    const all = parseCycles(cycleNodes);
    return all
      .filter((c) => {
        const ids = c.properties.includedTeamspaceIds ?? [];
        return ids.length === 0 || ids.includes(teamspaceId);
      })
      .toSorted((a, b) => a.properties.sortOrder - b.properties.sortOrder);
  }, [cycleNodes, teamspaceId]);

  const policies = React.useMemo(() => {
    const all = parsePolicies(policyNodes);
    return all.filter((p) => {
      const ids = p.properties.includedTeamspaceIds ?? [];
      return ids.length === 0 || ids.includes(teamspaceId);
    });
  }, [policyNodes, teamspaceId]);

  return (
    <BrowseWorkspace.Frame testId="work-cycle-workspace">
      <BrowseWorkspace.Header
        title="Work cycles"
        description={`Operating map for this teamspace — ${cycles.length} cycles, ${policies.length} gate policies. Expand a cycle (+) to reveal stages and gates inside it.`}
      />

      <BrowseWorkspace.Section label="Work cycle map (A–G)">
        {cycles.length > 0 ? (
          <WorkCycleDiagram cycles={cycles} policies={policies} />
        ) : (
          <BrowseWorkspace.Empty>
            No work_cycle instances seeded for this teamspace.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
