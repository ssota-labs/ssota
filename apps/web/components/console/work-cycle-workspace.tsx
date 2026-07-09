"use client";

import * as React from "react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import {
  WorkCycleDiagram,
  type WorkCycleDiagramMode,
} from "@/components/console/work-cycle-diagram";
import type {
  GatePolicyInstance,
  WorkCycleInstance,
} from "@/components/console/work-cycle-model";
import { gatePolicyPropertiesSchema, workCyclePropertiesSchema } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";

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

const MODE_COPY: Record<
  WorkCycleDiagramMode,
  { label: string; hint: string }
> = {
  "expand-collapse": {
    label: "Expand / collapse",
    hint: "Flat canvas — children use React Flow `hidden` (official expand-collapse).",
  },
  subflow: {
    label: "Parent / child",
    hint: "Sub Flow — children nest inside the cycle via `parentId` (official sub-flows).",
  },
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

  const [mode, setMode] = React.useState<WorkCycleDiagramMode>("subflow");

  return (
    <BrowseWorkspace.Frame testId="work-cycle-workspace">
      <BrowseWorkspace.Header
        title="Work cycles"
        description={`Operating map for this teamspace — ${cycles.length} cycles, ${policies.length} gate policies. Compare layout patterns below.`}
      />

      <BrowseWorkspace.Section label="Layout pattern">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Work cycle layout pattern"
          data-testid="work-cycle-mode-toggle"
        >
          {(Object.keys(MODE_COPY) as WorkCycleDiagramMode[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              data-testid={`work-cycle-mode-${key}`}
              onClick={() => setMode(key)}
              className={cn(
                "border-border rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                mode === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted/50",
              )}
            >
              <div className="font-medium">{MODE_COPY[key].label}</div>
              <div
                className={cn(
                  "mt-0.5 text-xs",
                  mode === key
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {MODE_COPY[key].hint}
              </div>
            </button>
          ))}
        </div>
      </BrowseWorkspace.Section>

      <BrowseWorkspace.Section label="Work cycle map (A–G)">
        {cycles.length > 0 ? (
          <WorkCycleDiagram
            key={mode}
            cycles={cycles}
            policies={policies}
            mode={mode}
          />
        ) : (
          <BrowseWorkspace.Empty>
            No work_cycle instances seeded for this teamspace.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
