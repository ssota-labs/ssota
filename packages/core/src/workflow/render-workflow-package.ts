import {
  workflowRowToWire,
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

  appendTriggerSection(lines, workflow);
  appendContextSection(lines, workflow);
  appendConditionsSection(lines, workflow);
  appendStepsSection(lines, workflow);
  appendGatesSection(lines, workflow);
  appendOutputSection(lines, workflow);
  appendReferencesSection(lines, workflow);
  appendRoutesSection(lines, workflow);
  appendAgentNotesSection(lines, workflow);

  return lines.join("\n").trimEnd();
}

function appendTriggerSection(lines: string[], workflow: WireWorkflow) {
  lines.push("## Trigger", "");
  const patterns = workflow.trigger.patterns;
  const events = workflow.trigger.events;
  if (patterns.length === 0 && events.length === 0) {
    lines.push("- manual");
  } else {
    if (patterns.length) {
      lines.push("Intent patterns:");
      for (const pattern of patterns) lines.push(`- ${pattern}`);
    }
    if (events.length) {
      if (patterns.length) lines.push("");
      lines.push("Automation events:");
      for (const event of events) lines.push(`- ${event}`);
    }
  }
  lines.push("");
}

function appendContextSection(lines: string[], workflow: WireWorkflow) {
  const { context } = workflow;
  const hasContext =
    context.queries.length > 0 ||
    context.traversals.length > 0 ||
    context.assertions.length > 0 ||
    Boolean(context.notes?.trim());

  if (!hasContext && workflow.applicableNodeTypes.length === 0) return;

  lines.push("## Context", "");
  if (workflow.applicableNodeTypes.length) {
    lines.push("Applicable node types:");
    for (const nodeType of workflow.applicableNodeTypes) {
      lines.push(`- ${nodeType}`);
    }
    lines.push("");
  }

  for (const query of context.queries) {
    const label = query.label ?? query.id;
    const filters = [
      query.nodeType ? `nodeType=${query.nodeType}` : null,
      query.lifecycleStatus ? `lifecycle=${query.lifecycleStatus}` : null,
      query.limit ? `limit=${query.limit}` : null,
    ].filter(Boolean);
    lines.push(`### Query: ${label}`);
    lines.push(
      filters.length
        ? `Run query_nodes({ ${filters.join(", ")} }).`
        : "Run query_nodes with the parameters declared in the workflow spec.",
    );
    lines.push("");
  }

  for (const traversal of context.traversals) {
    const label = traversal.label ?? traversal.id;
    lines.push(`### Traversal: ${label}`);
    lines.push(
      `From ${traversal.startNodeRef}, traverse ${traversal.direction} up to ${traversal.maxHops} hop(s).`,
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
    const label = assertion.label ?? assertion.id;
    lines.push(`### Assertion: ${label}`);
    lines.push(
      `- kind: ${assertion.kind} (${assertion.mode}, ${assertion.enforcement})`,
    );
    if (Object.keys(assertion.params).length) {
      lines.push(`- params: ${JSON.stringify(assertion.params)}`);
    }
    lines.push("");
  }

  if (context.notes?.trim()) {
    lines.push(context.notes.trim(), "");
  }
}

function appendConditionsSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.conditions.length === 0) return;
  lines.push("## Conditions", "");
  for (const condition of workflow.conditions) {
    const label = condition.label ?? condition.id;
    lines.push(`### ${label}`);
    lines.push(`- mode: ${condition.mode} (${condition.enforcement})`);
    if (condition.expression) lines.push(`- expression: ${condition.expression}`);
    if (condition.description) lines.push(`- ${condition.description}`);
    lines.push("");
  }
}

function appendStepsSection(lines: string[], workflow: WireWorkflow) {
  lines.push("## Steps", "");
  workflow.steps.forEach((step, index) => {
    lines.push(`### ${index + 1}. ${step.title}`);
    if (step.description) lines.push(step.description);
    lines.push(`- mode: ${step.mode}`);
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
    if (step.output) lines.push(`- output: ${step.output}`);
    if (step.routeToWorkflowKey) {
      lines.push(`- route to workflow: ${step.routeToWorkflowKey}`);
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

function appendOutputSection(lines: string[], workflow: WireWorkflow) {
  lines.push("## Output", "");
  if (workflow.output.format) lines.push(`- format: ${workflow.output.format}`);
  if (workflow.output.completionCriteria) {
    lines.push(`- completion: ${workflow.output.completionCriteria}`);
  }
  if (Object.keys(workflow.output.contract).length) {
    lines.push(`- contract: ${JSON.stringify(workflow.output.contract)}`);
  }
  lines.push("");
}

function appendReferencesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.references.length === 0) return;
  lines.push("## References", "");
  for (const reference of workflow.references) {
    lines.push(`### ${reference.title}`);
    if (reference.kind === "inline" && reference.body) {
      lines.push(reference.body);
    } else if (reference.kind === "url" && reference.url) {
      lines.push(`Fetch: ${reference.url}`);
    } else if (reference.kind === "workflow" && reference.workflowKey) {
      lines.push(`Follow workflow: ${reference.workflowKey}`);
    }
    lines.push("");
  }
}

function appendRoutesSection(lines: string[], workflow: WireWorkflow) {
  if (workflow.routes.length === 0) return;
  lines.push("## Routes", "");
  for (const route of workflow.routes) {
    const label = route.label ?? route.id;
    lines.push(
      `- ${label} → ${route.targetWorkflowKey}${route.conditionId ? ` (when ${route.conditionId})` : ""}`,
    );
  }
  lines.push("");
}

function appendAgentNotesSection(lines: string[], workflow: WireWorkflow) {
  if (!workflow.agentNotes?.trim()) return;
  if (workflow.references.some((ref) => ref.id === "agent_body")) return;
  lines.push("## Agent notes", "", workflow.agentNotes.trim(), "");
}
