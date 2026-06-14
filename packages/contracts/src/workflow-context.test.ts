import { describe, expect, it } from "vitest";
import {
  ContextSpecSchema,
  deriveApplicableNodeTypes,
  normalizeWorkflowContext,
} from "./workflow-context.js";

describe("workflow context", () => {
  it("parses filter groups with conditions", () => {
    const parsed = ContextSpecSchema.parse({
      filterGroups: [
        {
          id: "fg_task",
          nodeType: "Task",
          combinator: "and",
          conditions: [
            {
              id: "c1",
              propertyKey: "status",
              operator: "equals",
              value: "Active",
            },
          ],
        },
      ],
      traversals: [],
      assertions: [],
    });

    expect(parsed.filterGroups[0]?.nodeType).toBe("Task");
    expect(parsed.filterGroups[0]?.conditions[0]?.operator).toBe("equals");
  });

  it("migrates legacy queries into filter groups on read", () => {
    const migrated = normalizeWorkflowContext(
      {
        queries: [
          {
            id: "docs",
            label: "Documents",
            nodeType: "Document",
            lifecycleStatus: "Active",
            limit: 10,
          },
        ],
        traversals: [],
        assertions: [],
      },
      [],
    );

    expect(migrated.filterGroups).toHaveLength(1);
    expect(migrated.filterGroups[0]?.nodeType).toBe("Document");
    expect(migrated.filterGroups[0]?.lifecycleStatus).toBe("Active");
    expect(migrated.filterGroups[0]?.limit).toBe(10);
  });

  it("migrates applicableNodeTypes-only rows into filter groups", () => {
    const migrated = normalizeWorkflowContext(undefined, ["Document", "Task"]);

    expect(migrated.filterGroups.map((group) => group.nodeType)).toEqual([
      "Document",
      "Task",
    ]);
    expect(migrated.filterGroups.every((group) => group.conditions.length === 0)).toBe(
      true,
    );
  });

  it("derives applicable node types from filter groups", () => {
    const types = deriveApplicableNodeTypes(
      ContextSpecSchema.parse({
        filterGroups: [
          { id: "a", nodeType: "Document", combinator: "and", conditions: [] },
          { id: "b", nodeType: "Task", combinator: "or", conditions: [] },
          { id: "c", nodeType: "Document", combinator: "and", conditions: [] },
        ],
        traversals: [],
        assertions: [],
      }),
    );

    expect(types).toEqual(["Document", "Task"]);
  });

  it("migrates legacy startNodeRef traversals to startNodeType", () => {
    const migrated = normalizeWorkflowContext({
      filterGroups: [
        {
          id: "fg1",
          nodeType: "HomepageProject",
          combinator: "and",
          conditions: [],
        },
      ],
      traversals: [
        {
          id: "t1",
          startNodeRef: "fg1",
          direction: "outgoing",
          maxHops: 2,
        },
      ],
      assertions: [],
    });

    expect(migrated.traversals[0]?.startNodeType).toBe("HomepageProject");
    expect(migrated.traversals[0]?.startNodeRef).toBeUndefined();
  });

  it("round-trips structured context without queries key", () => {
    const input = {
      filterGroups: [
        {
          id: "fg1",
          nodeType: "HomepageProject",
          combinator: "and",
          conditions: [],
        },
      ],
      traversals: [
        {
          id: "t1",
          startNodeType: "HomepageProject",
          direction: "outgoing",
          maxHops: 2,
        },
      ],
      assertions: [
        {
          id: "a1",
          kind: "node_exists",
          mode: "agentic",
          enforcement: "soft",
          params: { nodeType: "DesignBrief" },
        },
      ],
    };

    const normalized = normalizeWorkflowContext(input, []);
    const parsed = ContextSpecSchema.parse(normalized);
    expect(parsed).toEqual(normalized);
    expect("queries" in parsed).toBe(false);
  });
});
