"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ssota/ui/components/ui/accordion";
import { Badge } from "@ssota/ui/components/ui/badge";
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
            onSelectCycle={(cycleKey) => setOpenCycleKey(cycleKey)}
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
          <Accordion
            value={openCycleKey ? [openCycleKey] : []}
            onValueChange={(next) => {
              setOpenCycleKey(next[0] ?? null);
            }}
            className="w-full"
          >
            {cycles.map((cycle) => {
              const meta = WORK_CYCLE_GROUP_META[cycle.properties.group];
              const topo = cycle.properties.topology;
              const gateCount = topo.nodes.filter((n) => n.kind === "gate").length;
              const stageCount = topo.nodes.filter((n) => n.kind === "stage").length;
              const cycleKey = cycle.properties.cycleKey;

              return (
                <AccordionItem
                  key={cycleKey}
                  value={cycleKey}
                  data-testid={`work-cycle-item-${cycleKey}`}
                >
                  <AccordionTrigger
                    className="px-3 py-3 text-left"
                    data-testid={`work-cycle-trigger-${cycleKey}`}
                  >
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
                          <span className="text-muted-foreground">
                            orch: {cycle.properties.orchestratorMode}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-1 pb-4">
                    <p className="text-muted-foreground mb-3 px-2 text-sm">
                      {cycle.properties.loopSummary ?? cycle.properties.endCondition}
                    </p>
                    {openCycleKey === cycleKey ? (
                      <WorkCycleTopologyDiagram
                        cycle={cycle}
                        policies={policies}
                      />
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
