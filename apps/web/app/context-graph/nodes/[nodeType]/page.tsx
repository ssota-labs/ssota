import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  addNodePropertyFormAction,
  defineScopedActionFormAction,
  defineWorkflowInstructionFormAction,
  runActionJsonFormAction,
} from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";

export default async function ContextGraphNodeTablePage({
  params,
}: {
  params: Promise<{ nodeType: string }>;
}) {
  const { nodeType } = await params;
  const decoded = decodeURIComponent(nodeType);
  const ports = getActionPorts();
  const [entry, rows, properties, actions, instructions] = await Promise.all([
    ports.catalog.getNodeCatalogEntry(decoded),
    ports.graph.queryNodes({ nodeType: decoded, limit: 50 }),
    ports.catalog.listPropertyCatalogEntries(),
    ports.catalog.listActionCatalogEntries(),
    ports.catalog.listInstructions({ limit: 100 }),
  ]);

  if (!entry) notFound();

  const propertyKeys =
    entry.propertyRefs.length > 0
      ? entry.propertyRefs
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row.properties))));
  const boundProperties = propertyKeys
    .map((key) => properties.find((property) => property.propertyKey === key))
    .filter(Boolean);
  const localActions = actions.filter((action) => {
    if (entry.allowedActionRefs.includes(action.actionType)) return true;
    if (action.scope.kind === "node_type") return action.scope.nodeType === decoded;
    if (action.scope.kind === "property") return action.scope.nodeType === decoded;
    return false;
  });
  const localInstructions = instructions.filter((instruction) => {
    if (instruction.applicableNodeTypes.includes(decoded)) return true;
    return instruction.scope.kind === "node_type" && instruction.scope.nodeType === decoded;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={entry.nodeType}
        description={`Node table · ${entry.family} · archetype=${entry.archetypeId}`}
      />

      <div className="flex flex-wrap gap-2">
        <ActionRunner actions={localActions.length ? localActions.map((a) => a.actionType) : actions.map((a) => a.actionType)} />
        <AddPropertySheet nodeType={decoded} />
        <AddActionSheet nodeType={decoded} />
        <AddInstructionSheet nodeType={decoded} />
        <Button render={<Link href="/log" />} variant="outline" nativeButton={false}>
          View logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Table schema</CardTitle>
          <CardDescription>
            Properties are column definitions. Changes are submitted as actions and may require gate approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {boundProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 바인딩된 property가 없습니다.</p>
          ) : (
            boundProperties.map((property) =>
              property ? (
                <Badge key={property.propertyKey} variant="secondary">
                  {property.propertyKey} · {property.valueType}
                </Badge>
              ) : null,
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rows</CardTitle>
          <CardDescription>
            Runtime nodes for this type. Row mutation still runs through executeAction().
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>id</TableHead>
                <TableHead>lifecycle</TableHead>
                {propertyKeys.map((key) => (
                  <TableHead key={key}>{key}</TableHead>
                ))}
                <TableHead>content</TableHead>
                <TableHead>updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={propertyKeys.length + 4} className="text-muted-foreground">
                    아직 생성된 node row가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.lifecycleStatus}</Badge>
                    </TableCell>
                    {propertyKeys.map((key) => (
                      <TableCell key={key}>{formatCell(row.properties[key])}</TableCell>
                    ))}
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.content ?? row.contentUrl ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.updatedAt.toISOString().slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Local actions</CardTitle>
            <CardDescription>Actions scoped to this node table.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {localActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">이 node table에 scoped된 action이 없습니다.</p>
            ) : (
              localActions.map((action) => (
                <div key={action.actionType} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{action.actionType}</div>
                  <div className="text-muted-foreground">{action.scope.kind}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Local instructions</CardTitle>
            <CardDescription>Workflow packages that apply to this node table.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {localInstructions.length === 0 ? (
              <p className="text-sm text-muted-foreground">이 node table에 scoped된 instruction이 없습니다.</p>
            ) : (
              localInstructions.map((instruction) => (
                <div key={instruction.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{instruction.title}</div>
                  <div className="text-muted-foreground">
                    {instruction.workflowSteps.length} steps · {instruction.allowedActions.length} allowed actions
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function ActionRunner({ actions }: { actions: string[] }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>Create node / Run action</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Run action</SheetTitle>
          <SheetDescription>
            JSON input으로 action을 실행합니다. 모든 변경은 executeAction()을 통과합니다.
          </SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" list="node-actions" required />
            <datalist id="node-actions">
              {actions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="input">Input JSON</Label>
            <Textarea id="input" name="input" defaultValue={'{ "title": "New node", "content": "" }'} />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function AddPropertySheet({ nodeType }: { nodeType: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add property</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add property to {nodeType}</SheetTitle>
          <SheetDescription>
            define_property 후 update_node_type으로 property binding을 추가합니다.
          </SheetDescription>
        </SheetHeader>
        <form action={addNodePropertyFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="nodeType" value={nodeType} />
          <div className="space-y-2">
            <Label htmlFor="propertyKey">Property key</Label>
            <Input id="propertyKey" name="propertyKey" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valueType">Value type</Label>
            <Input id="valueType" name="valueType" defaultValue="string" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owningActions">Owning actions</Label>
            <Input id="owningActions" name="owningActions" placeholder="create_document, update_document" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints JSON</Label>
            <Textarea id="constraints" name="constraints" defaultValue="{}" />
          </div>
          <Button type="submit">Submit change</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function AddActionSheet({ nodeType }: { nodeType: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add action</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add action to {nodeType}</SheetTitle>
          <SheetDescription>scope=node_type:{nodeType}로 action contract를 생성합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="scopeKind" value="node_type" />
          <input type="hidden" name="nodeType" value={nodeType} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" placeholder="publish_document" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preconditions">Preconditions JSON</Label>
            <Textarea id="preconditions" name="preconditions" defaultValue='{ "requiredFields": ["nodeId"] }' />
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

function AddInstructionSheet({ nodeType }: { nodeType: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add instruction</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add instruction to {nodeType}</SheetTitle>
          <SheetDescription>이 node table에 적용되는 agent workflow를 정의합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineWorkflowInstructionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="scopeKind" value="node_type" />
          <input type="hidden" name="nodeType" value={nodeType} />
          <input type="hidden" name="applicableNodeTypes" value={nodeType} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggerPatterns">Trigger patterns</Label>
            <Input id="triggerPatterns" name="triggerPatterns" defaultValue="manual" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedActions">Allowed actions</Label>
            <Input id="allowedActions" name="allowedActions" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflowSteps">Workflow steps JSON array</Label>
            <Textarea id="workflowSteps" name="workflowSteps" defaultValue="[]" />
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
