import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  ActionRunner,
  AddActionSheet,
  AddInstructionSheet,
  AddPropertySheet,
} from "@/components/context-graph/node-table-actions";
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

