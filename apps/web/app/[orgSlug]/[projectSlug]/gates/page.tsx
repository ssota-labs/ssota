import { approveGateFormAction } from "@/app/actions";
import { getActionPorts } from "@/lib/ports";
import { Button } from "@ssota/ui/components/ui/button";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";

export default async function GatesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  await params;
  const ports = getActionPorts();
  const gates = await ports.gate.listPendingGates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Human Gate</h1>
      {gates.length === 0 ? (
        <p className="text-muted-foreground">대기 중인 게이트가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>action</TableHead>
                  <TableHead>target</TableHead>
                  <TableHead>surface</TableHead>
                  <TableHead>proposed by</TableHead>
                  <TableHead>risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gates.map((gate) => {
                  const meta = deriveGateMetadata(gate);
                  return (
                    <TableRow key={gate.id}>
                      <TableCell className="font-medium">{gate.actionType}</TableCell>
                      <TableCell>{meta.target}</TableCell>
                      <TableCell>{meta.surface}</TableCell>
                      <TableCell className="text-muted-foreground">{gate.executorId.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{meta.risk}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {gates.map((gate) => {
            const meta = deriveGateMetadata(gate);
            return (
              <Card key={gate.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{gate.actionType}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{gate.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{meta.surface}</Badge>
                      <Badge variant="secondary">{meta.target}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveGateFormAction}>
                      <input type="hidden" name="gateId" value={gate.id} />
                      <input type="hidden" name="approved" value="true" />
                      <Button type="submit" size="sm">
                        승인
                      </Button>
                    </form>
                    <form action={approveGateFormAction}>
                      <input type="hidden" name="gateId" value={gate.id} />
                      <input type="hidden" name="approved" value="false" />
                      <Button type="submit" variant="outline" size="sm">
                        반려
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                    {JSON.stringify({ input: gate.input, proposedEffects: gate.proposedEffects }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
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
  if (!first) return { surface: "Context Graph", target: gate.actionType, risk: "low" };
  if (first.kind.includes("node")) {
    const target =
      (first.nodeType as string | undefined) ??
      ((first.node as Record<string, unknown> | undefined)?.nodeType as string | undefined) ??
      (gate.input.nodeType as string | undefined) ??
      "node";
    return { surface: "Nodes", target, risk: first.kind.includes("catalog") ? "medium" : "low" };
  }
  if (first.kind.includes("edge")) {
    return {
      surface: "Edges",
      target: (gate.input.edgeType as string | undefined) ?? "edge",
      risk: "medium",
    };
  }
  if (first.kind.includes("instruction")) {
    return { surface: "Instructions", target: gate.actionType, risk: "high" };
  }
  if (first.kind.includes("action")) {
    return { surface: "Actions", target: gate.actionType, risk: "high" };
  }
  return { surface: "Context Graph", target: gate.actionType, risk: "medium" };
}
