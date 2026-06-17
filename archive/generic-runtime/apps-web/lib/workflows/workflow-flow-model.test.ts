import { describe, expect, it } from "vitest";
import type { Workflow } from "@ssota/contracts";
import {
  ROUTE_OUTLET_HANDLE_TOP_BASE,
  ROUTE_OUTLET_HANDLE_SPACING,
  workflowToFlowGraph,
} from "./workflow-flow-model";

function step(id: string, title: string) {
  return {
    id,
    title,
    mode: "agentic" as const,
    actions: [],
    referenceIds: [],
  };
}

const routeWorkflow: Workflow = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  slug: "route-order",
  workflowKey: "route_order",
  lifecycle: "Active",
  scope: { kind: "global" },
  title: "Route order",
  trigger: {
    events: [{ id: "manual", kind: "manual", enabled: true, config: {} }],
  },
  context: { filterGroups: [], traversals: [], assertions: [] },
  flowEntry: { kind: "route", routeId: "route_1" },
  routeBlocks: [
    {
      id: "route_1",
      label: "Router",
      links: [],
      outlets: [
        {
          id: "out_1",
          label: "Out 1",
          target: { kind: "step", stepId: "step_1" },
        },
        {
          id: "out_2",
          label: "Out 2",
          target: { kind: "step", stepId: "step_2" },
        },
        {
          id: "out_3",
          label: "Out 3",
          target: { kind: "step", stepId: "step_3" },
        },
      ],
    },
  ],
  workflowBlocks: [],
  conditions: [],
  steps: [step("step_1", "First"), step("step_2", "Second"), step("step_3", "Third")],
  gates: [],
  routes: [],
  references: [],
  output: { contract: {} },
  applicableNodeTypes: [],
  allowedActions: [],
};

describe("workflow-flow-model", () => {
  it("aligns route branch targets top-to-bottom in outlet insertion order", () => {
    const { nodes } = workflowToFlowGraph(routeWorkflow);

    const routeNode = nodes.find((node) => node.id === "route:route_1");
    const step1 = nodes.find((node) => node.id === "step_1");
    const step2 = nodes.find((node) => node.id === "step_2");
    const step3 = nodes.find((node) => node.id === "step_3");

    expect(routeNode).toBeDefined();
    expect(step1).toBeDefined();
    expect(step2).toBeDefined();
    expect(step3).toBeDefined();

    const stepHeight = 120;
    const centerY = (node: NonNullable<typeof step1>) =>
      node.position.y + stepHeight / 2;

    expect(centerY(step1!)).toBeLessThan(centerY(step2!));
    expect(centerY(step2!)).toBeLessThan(centerY(step3!));

    const expectedHandleY = (outletIndex: number) =>
      routeNode!.position.y +
      ROUTE_OUTLET_HANDLE_TOP_BASE +
      outletIndex * ROUTE_OUTLET_HANDLE_SPACING;

    expect(centerY(step1!)).toBeCloseTo(expectedHandleY(0), 0);
    expect(centerY(step2!)).toBeCloseTo(expectedHandleY(1), 0);
    expect(centerY(step3!)).toBeCloseTo(expectedHandleY(2), 0);
  });
});
