import {
  workflowRowToWire,
  type RouteOutletTarget,
  type Workflow as WireWorkflow,
} from "@ssota/contracts";
import type { Workflow } from "../domain/types.js";

export type WorkflowPackage = {
  workflow: WireWorkflow;
  renderedText: string;
};

export function buildWorkflowPackage(workflow: Workflow): WorkflowPackage {
  const wire = workflowRowToWire({
    id: workflow.id,
    slug: workflow.slug,
    workflowKey: workflow.workflowKey,
    lifecycle: workflow.lifecycle,
    scope: workflow.scope,
    spec: workflow.spec,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  });
  return {
    workflow: wire,
    renderedText: renderWorkflowText(wire),
  };
}

export function renderWorkflowText(workflow: WireWorkflow): string {
  const lines: string[] = [`# ${workflow.title}`, ""];

  if (workflow.workflowRole?.trim()) {
    lines.push(`Role: ${workflow.workflowRole.trim()}`, "");
  }

  appendTriggerSection(lines, workflow);
  appendContextSection(lines, workflow);
  appendStepsSection(lines, workflow);
  appendGatesSection(lines, workflow);
  appendRoutesSection(lines, workflow);
  appendWorkflowBlocksSection(lines, workflow);
  appendAgentNotesSection(lines, workflow);

  // Legacy fallback for unmigrated persisted specs
  appendLegacyConditionsSection(lines, workflow);
  appendLegacyReferencesSection(lines, workflow);
  appendLegacyRoutesSection(lines, workflow);
  appendLegacyOutputSection(lines, workflow);

  return lines.join("\n").trimEnd();
}

function appendTriggerSection(lines: string[], workflow: WireWorkflow) {
  lines.push("## Trigger", "");
  const events = workflow.trigger.events.filter((event) => event.enabled);
  if (events.length === 0) {
    lines.push("- manual");
  } else {
    for (const event of events) {
      const status = event.enabled ? "on" : "off";
      lines.push(`- ${event.kind} (${status})`);
    }
  }
  lines.push("");
}

function appendContextSection(lines: string[], workflow: WireWorkflow) {
  const { context } = workflow;
  const hasContext =
    context.filterGroups.length > 0 ||
    context.traversals.length > 0 ||
    context.assertions.length > 0 ||
    Boolean(context.notes?.trim());

  const applicableNodeTypes = workflow.applicableNodeTypes;

  if (!hasContext && applicableNodeTypes.length === 0) return;

  lines.push("## Context", "");
  if (applicableNodeTypes.length) {
    lines.push("Applicable nodes:");
    for (const binding of applicableNodeTypes) {
      const enabledActions =
        binding.disabledActions.length > 0
          ? ` (disabled: ${binding.disabledActions.join(", ")})`
          : "";
      lines.push(`- ${binding.nodeType}${enabledActions}`);
    }
    lines.push("");
  }
  if (hasContext) {
    lines.push(
      "Fetch nodes with query_nodes, then apply filter groups below. MCP does not filter by property — evaluate conditions in agent context.",
      "",
    );
  }

  for (const group of context.filterGroups) {
    const label = group.label ?? group.id;
    const matchLabel = group.combinator === "or" ? "any" : "all";
    lines.push(`### Filter group: ${label}`);
    lines.push(`- nodeType: ${group.nodeType}`);
    lines.push(`- match: ${matchLabel}`);
    if (group.lifecycleStatus) {
      lines.push(`- lifecycle: ${group.lifecycleStatus}`);
    }
    if (group.limit) {
      lines.push(`- limit: ${group.limit}`);
    }
    if (group.conditions.length) {
      lines.push("- conditions:");
      for (const condition of group.conditions) {
        const value =
          condition.value !== undefined && condition.value !== ""
            ? ` "${condition.value}"`
            : "";
        lines.push(
          `  - ${condition.propertyKey} ${condition.operator}${value}`,
        );
      }
    } else {
      lines.push("- conditions: (none — include all rows of this node type)");
    }
    lines.push("");
  }

  for (const traversal of context.traversals) {
    const label = traversal.label ?? traversal.id;
    lines.push(`### Traversal: ${label}`);
    lines.push(
      `From node type ${traversal.startNodeType}, traverse ${traversal.direction} up to ${traversal.maxHops} hop(s).`,
    );
    if (traversal.edgeTypes?.length) {
      lines.push(`Edge types: ${traversal.edgeTypes.join(", ")}`);
    }
    if (traversal.nodeTypes?.length) {
      lines.push(`Node types: ${traversal.nodeTypes.join(", ")}`);
    }
    lines.push("");
  }

  for (const assertion of context.assertions) {
    const label = assertion.nodeType;
    const matchLabel = assertion.combinator === "or" ? "any" : "all";
    lines.push(`### Assertion: ${label}`);
    lines.push(`- nodeType: ${assertion.nodeType}`);
    lines.push(`- match: ${matchLabel}`);
    lines.push(`- mode: ${assertion.mode} (${assertion.enforcement})`);
    if (assertion.conditions.length) {
      lines.push("- checks:");
      for (const condition of assertion.conditions) {
        const value =
          condition.value !== undefined && condition.value !== ""
            ? ` "${condition.value}"`
            : "";
        lines.push(
          `  - ${condition.propertyKey} ${condition.operator}${value}`,
        );
      }
    } else {
      lines.push("- checks: (node type presence only)");
    }
    lines.push("");
  }

  if (context.notes?.trim()) {
    lines.push(context.notes.trim(), "");
  }
}

function appendStepsSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.steps.length === 0) return;
  lines.push("## Steps", "");
  workflow.steps.forEach((step, index) => {
    lines.push(`### ${index + 1}. ${step.title}`);
    if (step.description) lines.push(step.description);
    lines.push(`- mode: ${step.mode}`);
    if (step.instructionUrl) {
      lines.push(`- instruction: ${step.instructionUrl} (fetch when needed)`);
    }
    if (step.actions.length) {
      lines.push("- actions:");
      for (const action of step.actions) {
        lines.push(
          `  - ${action.actionType}${action.required ? " (required)" : ""}`,
        );
      }
    }
    if (step.gate?.required) {
      lines.push("- human gate required before continuing");
    }
    if (step.nextStepId) {
      const next = workflow.steps.find((item) => item.id === step.nextStepId);
      lines.push(`- next: ${next?.title ?? step.nextStepId}`);
    }
    lines.push("");
  });
}

function appendGatesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.gates.length === 0) return;
  lines.push("## Gate policy", "");
  for (const gate of workflow.gates) {
    lines.push(`- ${gate.id}: ${JSON.stringify(gate.policy)}`);
    if (gate.reason) lines.push(`  reason: ${gate.reason}`);
  }
  lines.push("");
}

function describeOutletTarget(
  workflow: WireWorkflow,
  target: RouteOutletTarget,
): string {
  switch (target.kind) {
    case "step": {
      const step = workflow.steps.find((item) => item.id === target.stepId);
      return `step "${step?.title ?? target.stepId}"`;
    }
    case "route": {
      const route = workflow.routeBlocks.find(
        (item) => item.id === target.routeId,
      );
      return `route "${route?.label ?? target.routeId}"`;
    }
    case "workflow": {
      const block = workflow.workflowBlocks.find(
        (item) => item.id === target.workflowBlockId,
      );
      return `workflow ${block?.workflowKey ?? target.workflowBlockId} (call get_workflow when needed)`;
    }
  }
}

function appendRoutesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.routeBlocks.length === 0) return;
  lines.push("## Routes", "");
  for (const route of workflow.routeBlocks) {
    lines.push(`### ${route.label}`);
    if (route.routingInstructionUrl) {
      lines.push(
        `- routing instruction: ${route.routingInstructionUrl} (fetch when needed)`,
      );
    }
    for (const link of route.links) {
      const sourceHint = link.source ? ` via ${link.source}` : "";
      const label = link.label ? `${link.label}: ` : "";
      lines.push(`- link${sourceHint}: ${label}${link.url}`);
    }
    if (route.outlets.length) {
      lines.push("- outlets:");
      for (const outlet of route.outlets) {
        const target = outlet.target
          ? describeOutletTarget(workflow, outlet.target)
          : "(not connected)";
        lines.push(`  - ${outlet.label} → ${target}`);
      }
    }
    lines.push("");
  }
}

function appendWorkflowBlocksSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.workflowBlocks.length === 0) return;
  lines.push("## Workflow handoffs", "");
  for (const block of workflow.workflowBlocks) {
    const label = block.label ? `${block.label}: ` : "";
    lines.push(
      `- ${label}${block.workflowKey} (progressive — call get_workflow when needed)`,
    );
  }
  lines.push("");
}

function appendAgentNotesSection(lines: string[], workflow: WireWorkflow) {
  if (!workflow.agentNotes?.trim()) return;
  lines.push("## Agent notes", "", workflow.agentNotes.trim(), "");
}

function appendLegacyConditionsSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.conditions.length === 0) return;
  lines.push("## Conditions (legacy)", "");
  for (const condition of workflow.conditions) {
    const label = condition.label ?? condition.id;
    lines.push(`### ${label}`);
    lines.push(`- mode: ${condition.mode} (${condition.enforcement})`);
    if (condition.expression) lines.push(`- expression: ${condition.expression}`);
    if (condition.description) lines.push(`- ${condition.description}`);
    lines.push("");
  }
}

function appendLegacyReferencesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.references.length === 0) return;
  lines.push("## References (legacy)", "");
  for (const reference of workflow.references) {
    lines.push(`### ${reference.title}`);
    if (reference.kind === "inline" && reference.body) {
      lines.push(reference.body);
    } else if (reference.kind === "url" && reference.url) {
      const sourceHint = reference.source
        ? ` via ${reference.source} MCP`
        : "";
      lines.push(`Fetch when needed${sourceHint}: ${reference.url}`);
    } else if (reference.kind === "workflow" && reference.workflowKey) {
      lines.push(
        `Follow workflow (progressive): ${reference.workflowKey} — call get_workflow when needed`,
      );
    }
    lines.push("");
  }
}

function appendLegacyRoutesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.routes.length === 0) return;
  lines.push("## Routes (legacy)", "");
  for (const route of workflow.routes) {
    const label = route.label ?? route.id;
    lines.push(
      `- ${label} → ${route.targetWorkflowKey} (progressive — call get_workflow when needed)${route.conditionId ? ` when ${route.conditionId}` : ""}`,
    );
  }
  lines.push("");
}

function appendLegacyOutputSection(lines: string[], workflow: WireWorkflow) {
  const hasOutput =
    workflow.output.format ||
    workflow.output.completionCriteria ||
    Object.keys(workflow.output.contract).length > 0;
  if (!hasOutput) return;
  lines.push("## Output (legacy)", "");
  if (workflow.output.format) lines.push(`- format: ${workflow.output.format}`);
  if (workflow.output.completionCriteria) {
    lines.push(`- completion: ${workflow.output.completionCriteria}`);
  }
  if (Object.keys(workflow.output.contract).length) {
    lines.push(`- contract: ${JSON.stringify(workflow.output.contract)}`);
  }
  lines.push("");
}
