import { describe, expect, it } from "vitest";
import {
  ContextSpecSchema,
  deriveApplicableNodeTypes,
  normalizeWorkflowContext,
} from "@ssota/contracts";

describe("workflow context", () => {
  it("parses filter groups with conditions", () => {
    const parsed = ContextSpecSchema.parse({
      filterGroups: [
        {
          id: "fg_feature",
          nodeType: "Feature",
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

    expect(parsed.filterGroups[0]?.nodeType).toBe("Feature");
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
    const migrated = normalizeWorkflowContext(undefined, ["Document", "Feature"]);

    expect(migrated.filterGroups.map((group) => group.nodeType)).toEqual([
      "Document",
      "Feature",
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
          { id: "b", nodeType: "Feature", combinator: "or", conditions: [] },
          { id: "c", nodeType: "Document", combinator: "and", conditions: [] },
        ],
        traversals: [],
        assertions: [],
      }),
    );

    expect(types).toEqual(["Document", "Feature"]);
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

  it("migrates legacy kind-based assertions to nodeType + checks", () => {
    const migrated = normalizeWorkflowContext({
      filterGroups: [
        {
          id: "fg1",
          nodeType: "Document",
          combinator: "and",
          conditions: [],
        },
      ],
      traversals: [],
      assertions: [
        {
          id: "assert_draft",
          kind: "status_equals",
          mode: "agentic",
          enforcement: "soft",
          params: { status: "Draft" },
        },
      ],
    });

    expect(migrated.assertions[0]?.nodeType).toBe("Document");
    expect(migrated.assertions[0]?.conditions[0]).toMatchObject({
      propertyKey: "lifecycle_status",
      operator: "equals",
      value: "Draft",
    });
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
          nodeType: "DesignBrief",
          combinator: "and",
          conditions: [
            {
              id: "c1",
              propertyKey: "title",
              operator: "is_not_empty",
            },
          ],
          mode: "agentic",
          enforcement: "soft",
        },
      ],
    };

    const normalized = normalizeWorkflowContext(input, []);
    const parsed = ContextSpecSchema.parse(normalized);
    expect(parsed).toEqual(normalized);
    expect("queries" in parsed).toBe(false);
  });
});
