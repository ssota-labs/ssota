import type { Workflow } from "@ssota/contracts";
import { getWorkflowTriggerMeta } from "@/lib/workflows/workflow-trigger-catalog";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export function WorkflowBuilderSections({ workflow }: { workflow: Workflow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {workflow.workflowRole ? (
        <SectionCard title="Role" description="Optional workflow metadata tag">
          <Badge variant="secondary">{workflow.workflowRole}</Badge>
        </SectionCard>
      ) : null}

      <SectionCard title="Trigger" description="When this workflow may start">
        <div className="flex flex-wrap gap-1.5">
          {workflow.trigger.events.filter((event) => event.enabled).length ? (
            workflow.trigger.events
              .filter((event) => event.enabled)
              .map((event) => {
                const meta = getWorkflowTriggerMeta(event.kind);
                return (
                  <Badge key={event.id} variant="secondary">
                    {meta.label}
                  </Badge>
                );
              })
          ) : (
            <span className="text-sm text-muted-foreground">No active triggers</span>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Context"
        description="Structured retrieval plan for agents"
      >
        <div className="space-y-3 text-sm">
          {workflow.context.filterGroups.length ? (
            <div>
              <div className="mb-1 font-medium">Filter groups</div>
              <ul className="space-y-1 text-muted-foreground">
                {workflow.context.filterGroups.map((group) => (
                  <li key={group.id}>
                    {group.label ?? group.id}
                    {group.nodeType ? ` · ${group.nodeType}` : ""}
                    {group.conditions.length
                      ? ` · ${group.conditions.length} condition(s)`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {workflow.context.traversals.length ? (
            <div>
              <div className="mb-1 font-medium">Traversals</div>
              <ul className="space-y-1 text-muted-foreground">
                {workflow.context.traversals.map((traversal) => (
                  <li key={traversal.id}>
                    {traversal.label ?? traversal.id} · from{" "}
                    {traversal.startNodeType} · {traversal.maxHops} hop(s){" "}
                    {traversal.direction}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {workflow.context.assertions.length ? (
            <div>
              <div className="mb-1 font-medium">Assertions</div>
              <ul className="space-y-1 text-muted-foreground">
                {workflow.context.assertions.map((assertion) => (
                  <li key={assertion.id}>
                    {assertion.nodeType}
                    {assertion.conditions.length
                      ? ` · ${assertion.conditions.length} check(s)`
                      : ""}{" "}
                    · {assertion.enforcement}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!workflow.context.filterGroups.length &&
          !workflow.context.traversals.length &&
          !workflow.context.assertions.length ? (
            <p className="text-muted-foreground">
              {workflow.applicableNodeTypes.length
                ? `Applicable types: ${workflow.applicableNodeTypes.map((entry) => entry.nodeType).join(", ")}`
                : "No structured context yet."}
            </p>
          ) : null}
        </div>
      </SectionCard>

      {workflow.routeBlocks.length ? (
        <SectionCard
          title="Routes"
          description="Multi-outlet dispatcher graph"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {workflow.routeBlocks.map((route) => (
              <div key={route.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="font-medium">{route.label}</div>
                {route.links.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {route.links.map((link) => (
                      <li key={link.id}>
                        {link.label ? `${link.label}: ` : ""}
                        {link.url}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {route.outlets.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {route.outlets.map((outlet) => (
                      <li key={outlet.id}>
                        {outlet.label}
                        {outlet.target ? ` → ${outlet.target.kind}` : " (open)"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Steps"
        description="Semantic work units with action contracts"
        className="lg:col-span-2"
      >
        <div className="space-y-3">
          {workflow.steps.map((step, index) => (
            <div key={step.id} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span className="font-medium">{step.title}</span>
                <Badge variant="outline">{step.mode}</Badge>
                {step.gate?.required ? (
                  <Badge variant="secondary">gate</Badge>
                ) : null}
              </div>
              {step.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              ) : null}
              {step.instructionUrl ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.instructionUrl}
                </p>
              ) : null}
              {step.actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {step.actions.map((action) => (
                    <Badge key={action.actionType} variant="secondary">
                      {action.actionType}
                      {action.required ? " *" : ""}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>

      {workflow.workflowBlocks.length ? (
        <SectionCard title="Workflow handoffs" description="Branch terminators">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {workflow.workflowBlocks.map((block) => (
              <li key={block.id}>
                {block.label ? `${block.label} → ` : ""}
                {block.workflowKey}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {workflow.gates.length ? (
        <SectionCard title="Gates" description="Human approval policy">
          <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
            {JSON.stringify(workflow.gates, null, 2)}
          </pre>
        </SectionCard>
      ) : null}

      {workflow.agentNotes?.trim() ? (
        <SectionCard title="Agent notes" description="Completion and guidance">
          <p className="whitespace-pre-wrap text-sm">{workflow.agentNotes}</p>
        </SectionCard>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
