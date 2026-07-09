"use client";

import * as React from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import {
  WorkCycleOverviewDiagram,
  WorkCycleTopologyDiagram,
} from "@/components/console/work-cycle-diagram";
import {
  WORK_CYCLE_GROUP_META,
  type GatePolicyInstance,
  type WorkCycleInstance,
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
    return all.filter((c) => {
      const ids = c.properties.includedTeamspaceIds ?? [];
      return ids.length === 0 || ids.includes(teamspaceId);
    });
  }, [cycleNodes, teamspaceId]);

  const policies = React.useMemo(() => {
    const all = parsePolicies(policyNodes);
    return all.filter((p) => {
      const ids = p.properties.includedTeamspaceIds ?? [];
      return ids.length === 0 || ids.includes(teamspaceId);
    });
  }, [policyNodes, teamspaceId]);

  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const selected = cycles.find((c) => c.properties.cycleKey === selectedKey) ?? null;

  return (
    <BrowseWorkspace.Frame testId="work-cycle-workspace">
      <BrowseWorkspace.Header
        title="Work cycles"
        description={`Operating map for this teamspace — ${cycles.length} cycles, ${policies.length} gate policies. Click a cycle to inspect its topology and gates.`}
      />
      <BrowseWorkspace.Section label="Cycle overview (A–G)">
        {cycles.length > 0 ? (
          <WorkCycleOverviewDiagram
            cycles={cycles}
            onSelectCycle={setSelectedKey}
          />
        ) : (
          <BrowseWorkspace.Empty>
            No work_cycle instances seeded for this teamspace.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>

      {selected ? (
        <BrowseWorkspace.Section
          label={`${WORK_CYCLE_GROUP_META[selected.properties.group].letter}. ${selected.title}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              {selected.properties.loopSummary ?? selected.properties.endCondition}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedKey(null)}
            >
              Back to overview
            </Button>
          </div>
          <WorkCycleTopologyDiagram cycle={selected} policies={policies} />
        </BrowseWorkspace.Section>
      ) : null}
    </BrowseWorkspace.Frame>
  );
}
