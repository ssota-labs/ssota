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
                    {assertion.label ?? assertion.id} · {assertion.kind} (
                    {assertion.mode})
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
                ? `Applicable types: ${workflow.applicableNodeTypes.join(", ")}`
                : "No structured context yet."}
            </p>
          ) : null}
        </div>
      </SectionCard>

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

      {workflow.gates.length ? (
        <SectionCard title="Gates" description="Human approval policy">
          <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
            {JSON.stringify(workflow.gates, null, 2)}
          </pre>
        </SectionCard>
      ) : null}

      <SectionCard title="Output" description="Expected artifacts">
        <div className="space-y-2 text-sm">
          {workflow.output.completionCriteria ? (
            <p>{workflow.output.completionCriteria}</p>
          ) : (
            <p className="text-muted-foreground">No completion criteria.</p>
          )}
          {Object.keys(workflow.output.contract).length ? (
            <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(workflow.output.contract, null, 2)}
            </pre>
          ) : null}
        </div>
      </SectionCard>

      {workflow.references.length ? (
        <SectionCard
          title="References"
          description="Progressive disclosure links"
          className="lg:col-span-2"
        >
          <ul className="space-y-2 text-sm">
            {workflow.references.map((reference) => (
              <li key={reference.id} className="rounded-md border p-3">
                <div className="font-medium">{reference.title}</div>
                <div className="text-muted-foreground">{reference.kind}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {workflow.routes.length ? (
        <SectionCard title="Routes" description="Hand-off to other workflows">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {workflow.routes.map((route) => (
              <li key={route.id}>
                {route.label ?? route.id} → {route.targetWorkflowKey}
              </li>
            ))}
          </ul>
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
