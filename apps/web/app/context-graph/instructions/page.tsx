import { Badge } from "@loopos/ui/components/ui/badge";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@loopos/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@loopos/ui/components/ui/table";
import { Textarea } from "@loopos/ui/components/ui/textarea";
import { defineWorkflowInstructionFormAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";

export default async function ContextGraphInstructionsPage() {
  const ports = getActionPorts();
  const [instructions, logs] = await Promise.all([
    ports.catalog.listInstructions({ limit: 100 }),
    ports.commit.getActionLog({ limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructions"
        description="Agent workflow packages: context gathering, action sequence, output contract, and gate policy."
      />
      <div className="flex justify-end">
        <NewInstructionSheet />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow registry</CardTitle>
          <CardDescription>
            Instructions are workflow programs that agents can follow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>name</TableHead>
                <TableHead>scope</TableHead>
                <TableHead>triggers</TableHead>
                <TableHead>steps</TableHead>
                <TableHead>allowed actions</TableHead>
                <TableHead>last run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructions.map((instruction) => {
                const lastRun = logs.find((log) =>
                  log.metadata.instructionId === instruction.id ||
                  log.input.instructionId === instruction.id,
                );
                return (
                  <TableRow key={instruction.id}>
                    <TableCell className="font-medium">{instruction.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatInstructionScope(instruction.scope)}</Badge>
                    </TableCell>
                    <TableCell>{[...instruction.triggerPatterns, ...instruction.triggers].join(", ")}</TableCell>
                    <TableCell>{instruction.workflowSteps.length}</TableCell>
                    <TableCell>{instruction.allowedActions.length || instruction.requiredActions.length}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastRun?.createdAt.toISOString().slice(0, 10) ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatInstructionScope(scope: { kind: string } & Record<string, unknown>) {
  if (scope.kind === "node_type") return `node:${scope.nodeType}`;
  if (scope.kind === "edge_type") return `edge:${scope.edgeType}`;
  if (scope.kind === "property") return `property:${scope.nodeType}.${scope.propertyKey}`;
  if (scope.kind === "action") return `action:${scope.actionType}`;
  return "global";
}

function NewInstructionSheet() {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>New instruction</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New workflow instruction</SheetTitle>
          <SheetDescription>define_instruction 메타 액션으로 agent workflow를 추가합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineWorkflowInstructionFormAction} className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggerPatterns">Trigger patterns</Label>
            <Input id="triggerPatterns" name="triggerPatterns" defaultValue="manual" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggers">Automation triggers</Label>
            <Input id="triggers" name="triggers" placeholder="task_assigned, gate_created" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedActions">Allowed actions</Label>
            <Input id="allowedActions" name="allowedActions" placeholder="query_nodes, create_document" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflowSteps">Workflow steps JSON array</Label>
            <Textarea
              id="workflowSteps"
              name="workflowSteps"
              defaultValue='[{ "id": "gather_context", "title": "Gather context", "actionRefs": [] }]'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outputContract">Output contract JSON</Label>
            <Textarea id="outputContract" name="outputContract" defaultValue="{}" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gatePolicy">Gate policy JSON</Label>
            <Textarea id="gatePolicy" name="gatePolicy" defaultValue="{}" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" name="body" required />
          </div>
          <Button type="submit">Submit instruction</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
