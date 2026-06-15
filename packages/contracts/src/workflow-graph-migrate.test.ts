import { describe, expect, it } from "vitest";
import { migrateWorkflowGraph } from "./workflow-graph-migrate.js";
import { WorkflowDefinitionSchema } from "./workflow.js";

const manualTrigger = {
  id: "manual",
  kind: "manual",
  enabled: true,
  config: {},
} as const;

describe("migrateWorkflowGraph", () => {
  it("migrates legacy routes into routeBlocks and workflowBlocks", () => {
    const definition = WorkflowDefinitionSchema.parse({
      title: "Dispatcher",
      workflowKey: "main_entry",
      trigger: { events: [manualTrigger] },
      steps: [{ id: "lock", title: "Acquire lock", actions: [] }],
      routes: [
        {
          id: "route_discovery",
          targetWorkflowKey: "discovery_steward",
          label: "discovery",
        },
      ],
    });

    const migrated = migrateWorkflowGraph(definition);
    expect(migrated.routeBlocks).toHaveLength(1);
    expect(migrated.workflowBlocks).toHaveLength(1);
    expect(migrated.workflowBlocks[0]?.workflowKey).toBe("discovery_steward");
    expect(migrated.routes).toEqual([]);
    expect(migrated.flowEntry?.kind).toBe("route");
  });

  it("moves completionCriteria from output to agentNotes", () => {
    const definition = WorkflowDefinitionSchema.parse({
      title: "Doc",
      trigger: { events: [manualTrigger] },
      steps: [{ id: "execute", title: "Run", actions: [] }],
      output: {
        contract: {},
        completionCriteria: "Document exists",
      },
    });

    const migrated = migrateWorkflowGraph(definition);
    expect(migrated.agentNotes).toContain("Document exists");
    expect(migrated.output.completionCriteria).toBeUndefined();
  });

  it("copies reference url to step instructionUrl", () => {
    const definition = WorkflowDefinitionSchema.parse({
      title: "Doc",
      trigger: { events: [manualTrigger] },
      steps: [
        {
          id: "execute",
          title: "Run",
          actions: [],
          referenceIds: ["runbook"],
        },
      ],
      references: [
        {
          id: "runbook",
          title: "Runbook",
          kind: "url",
          url: "https://notion.so/runbook",
        },
      ],
    });

    const migrated = migrateWorkflowGraph(definition);
    expect(migrated.steps[0]?.instructionUrl).toBe("https://notion.so/runbook");
    expect(migrated.references).toEqual([]);
  });
});
