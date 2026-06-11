import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { defineScopedActionFormAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";

export default async function ContextGraphActionsPage() {
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const [actions, logs] = await Promise.all([
    ports.catalog.listActionCatalogEntries(),
    ports.commit.getActionLog({ limit: 100 }),
  ]);
  const runCounts = new Map<string, number>();
  for (const log of logs) runCounts.set(log.actionType, (runCounts.get(log.actionType) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actions"
        description="Global registry of typed capabilities. Actions can also be created from Nodes, Edges, Properties, and Instructions."
      />
      <div className="flex justify-end">
        <NewActionSheet />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action registry</CardTitle>
          <CardDescription>Scope controls where an action can mutate the graph.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>action_type</TableHead>
                <TableHead>scope</TableHead>
                <TableHead>executor</TableHead>
                <TableHead>effects</TableHead>
                <TableHead>runs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action.actionType}>
                  <TableCell className="font-medium">{action.actionType}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatScope(action.scope)}</Badge>
                  </TableCell>
                  <TableCell>{action.executor}</TableCell>
                  <TableCell>{action.effects.map((effect) => effect.kind).join(", ") || "-"}</TableCell>
                  <TableCell>{runCounts.get(action.actionType) ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatScope(scope: { kind: string } & Record<string, unknown>) {
  if (scope.kind === "node_type") return `node:${scope.nodeType}`;
  if (scope.kind === "edge_type") return `edge:${scope.edgeType}`;
  if (scope.kind === "property") return `property:${scope.nodeType}.${scope.propertyKey}`;
  if (scope.kind === "instruction") return `instruction:${scope.title ?? scope.instructionId ?? "*"}`;
  return "global";
}

function NewActionSheet() {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>New action</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New action contract</SheetTitle>
          <SheetDescription>Global action을 생성합니다. Local action은 node/edge/property 화면에서 생성하세요.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="scopeKind" value="global" />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preconditions">Preconditions JSON</Label>
            <Textarea id="preconditions" name="preconditions" defaultValue="{}" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effects">Effects JSON array</Label>
            <Textarea id="effects" name="effects" defaultValue="[]" />
          </div>
          <Button type="submit">Submit action contract</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
