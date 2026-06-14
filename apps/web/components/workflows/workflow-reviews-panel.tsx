import { approveGateFormAction } from "@/app/actions";
import { getTranslations } from "@/lib/i18n/server";
import type { Gate } from "@ssota/core";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";

export async function WorkflowReviewsPanel({
  gates,
  projectId,
  emptyMessage,
}: {
  gates: Gate[];
  projectId: string;
  emptyMessage?: string;
}) {
  const { t } = await getTranslations();

  if (gates.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {emptyMessage ?? t("gates.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {gates.map((gate) => {
        const meta = deriveGateMetadata(gate);
        const changes = summarizeEffects(gate.proposedEffects, gate.input);
        return (
          <Card key={gate.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  {reviewTitle(gate.actionType)}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gate.reason}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{meta.surface}</Badge>
                  <Badge variant="secondary">{meta.target}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium">What will change</div>
                <ul className="space-y-2">
                  {changes.map((change) => (
                    <li
                      key={change}
                      className="rounded-md border bg-muted/30 p-3 text-sm"
                    >
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <form action={approveGateFormAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="gateId" value={gate.id} />
                  <input type="hidden" name="approved" value="true" />
                  <div className="space-y-2">
                    <Input
                      name="decisionNote"
                      placeholder="Approval note…"
                      aria-label="Approval note"
                    />
                    <Button type="submit" size="sm" className="w-full">
                      {t("gates.approve")}
                    </Button>
                  </div>
                </form>
                <form action={approveGateFormAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="gateId" value={gate.id} />
                  <input type="hidden" name="approved" value="false" />
                  <div className="space-y-2">
                    <Input
                      name="decisionNote"
                      placeholder="Rejection reason…"
                      aria-label="Rejection reason"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {t("gates.reject")}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function deriveGateMetadata(gate: {
  actionType: string;
  input: Record<string, unknown>;
  proposedEffects: { kind: string }[];
}) {
  const first = gate.proposedEffects[0] as
    | ({ kind: string } & Record<string, unknown>)
    | undefined;
  if (!first) {
    return { surface: "Context Graph", target: gate.actionType, risk: "low" };
  }
  if (first.kind.includes("node")) {
    const target =
      (first.nodeType as string | undefined) ??
      ((first.node as Record<string, unknown> | undefined)?.nodeType as
        | string
        | undefined) ??
      (gate.input.nodeType as string | undefined) ??
      "node";
    return {
      surface: "Nodes",
      target,
      risk: first.kind.includes("catalog") ? "medium" : "low",
    };
  }
  if (first.kind.includes("edge")) {
    return {
      surface: "Edges",
      target: (gate.input.edgeType as string | undefined) ?? "edge",
      risk: "medium",
    };
  }
  if (first.kind.includes("instruction")) {
    return { surface: "Workflows", target: gate.actionType, risk: "high" };
  }
  if (first.kind.includes("action")) {
    return { surface: "Actions", target: gate.actionType, risk: "high" };
  }
  return { surface: "Context Graph", target: gate.actionType, risk: "medium" };
}

function reviewTitle(actionType: string) {
  return `Review ${actionType}`;
}

function summarizeEffects(
  effects: { kind: string }[],
  input: Record<string, unknown>,
) {
  if (effects.length === 0) return ["No concrete effects were proposed."];
  return effects.map((effect) => {
    const record = effect as { kind: string } & Record<string, unknown>;
    const kind = effect.kind;
    if (kind === "create_node") {
      const node = record.node as Record<string, unknown> | undefined;
      return `Create ${String(node?.nodeType ?? input.nodeType ?? "node")} in Draft.`;
    }
    if (kind === "update_node") {
      return `Update node ${String(record.nodeId ?? input.nodeId ?? "unknown")}.`;
    }
    if (kind.includes("node_catalog") || kind.includes("node_type")) {
      return `Change node catalog entry ${String(record.nodeType ?? input.nodeType ?? "unknown")}.`;
    }
    if (kind.includes("edge")) {
      return `Change edge relationship ${String(record.edgeType ?? input.edgeType ?? "unknown")}.`;
    }
    if (kind.includes("instruction")) {
      return `Change workflow instruction ${String(input.instructionId ?? input.title ?? "unknown")}.`;
    }
    if (kind.includes("action")) {
      return `Change action contract ${String(input.actionType ?? "unknown")}.`;
    }
    return `Apply ${kind}.`;
  });
}

export function gateMatchesWorkflow(
  gate: Gate,
  workflowId: string,
  allowedActions: string[],
): boolean {
  if (gate.input.instructionId === workflowId) return true;
  if (allowedActions.includes(gate.actionType)) return true;
  if (gate.actionType.includes("instruction")) return true;
  return false;
}
