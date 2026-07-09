"use client";

import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ssota/ui/components/ui/collapsible";
import { cn } from "@ssota/ui/lib/utils";
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

function CycleAccordionRow({
  cycle,
  policies,
  open,
  onOpenChange,
}: {
  cycle: WorkCycleInstance;
  policies: GatePolicyInstance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = WORK_CYCLE_GROUP_META[cycle.properties.group];
  const topo = cycle.properties.topology;
  const gateCount = topo.nodes.filter((n) => n.kind === "gate").length;
  const stageCount = topo.nodes.filter((n) => n.kind === "stage").length;
  const cycleKey = cycle.properties.cycleKey;

  // Defer React Flow mount until the collapsible panel has real dimensions
  // (fitView on a 0-width host collapses all nodes off-canvas).
  const [diagramReady, setDiagramReady] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setDiagramReady(false);
      return;
    }
    const id = window.setTimeout(() => setDiagramReady(true), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      data-testid={`work-cycle-item-${cycleKey}`}
      className="border-border rounded-lg border"
    >
      <CollapsibleTrigger
        data-testid={`work-cycle-trigger-${cycleKey}`}
        className="hover:bg-muted/40 flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <CaretDownIcon
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-semibold">
            {meta.letter}. {cycle.title}
          </span>
          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs font-normal">
            <Badge variant="secondary">{stageCount} stages</Badge>
            <Badge variant={gateCount > 0 ? "outline" : "secondary"}>
              {gateCount} gates
            </Badge>
            {cycle.properties.orchestratorMode ? (
              <span>orch: {cycle.properties.orchestratorMode}</span>
            ) : null}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border border-t px-2 pb-3 pt-2">
        <p className="text-muted-foreground mb-3 px-1 text-sm">
          {cycle.properties.loopSummary ?? cycle.properties.endCondition}
        </p>
        {open && diagramReady ? (
          <WorkCycleTopologyDiagram
            key={cycleKey}
            cycle={cycle}
            policies={policies}
          />
        ) : open ? (
          <div className="bg-muted/20 border-border text-muted-foreground flex h-[480px] items-center justify-center rounded-xl border text-sm">
            Laying out topology…
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

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

  // Collapsed by default — open only when the user expands a row (or clicks overview).
  const [openCycleKey, setOpenCycleKey] = React.useState<string | null>(null);

  return (
    <BrowseWorkspace.Frame testId="work-cycle-workspace">
      <BrowseWorkspace.Header
        title="Work cycles"
        description={`Operating map for this teamspace — ${cycles.length} cycles, ${policies.length} gate policies. Expand a cycle to see stages and gates.`}
      />

      <BrowseWorkspace.Section label="Cycle overview (A–G)">
        {cycles.length > 0 ? (
          <WorkCycleOverviewDiagram
            cycles={cycles}
            onSelectCycle={(cycleKey) => {
              setOpenCycleKey(cycleKey);
              // Scroll the matching accordion row into view after open.
              requestAnimationFrame(() => {
                document
                  .querySelector(`[data-testid="work-cycle-item-${cycleKey}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            }}
          />
        ) : (
          <BrowseWorkspace.Empty>
            No work_cycle instances seeded for this teamspace.
          </BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>

      <BrowseWorkspace.Section label="Cycle detail">
        {cycles.length === 0 ? (
          <BrowseWorkspace.Empty>No cycles to expand.</BrowseWorkspace.Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {cycles.map((cycle) => {
              const cycleKey = cycle.properties.cycleKey;
              return (
                <CycleAccordionRow
                  key={cycleKey}
                  cycle={cycle}
                  policies={policies}
                  open={openCycleKey === cycleKey}
                  onOpenChange={(next) =>
                    setOpenCycleKey(next ? cycleKey : null)
                  }
                />
              );
            })}
          </div>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
