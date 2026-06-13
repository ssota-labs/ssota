import Link from "next/link";
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
import { PageHeader } from "@/components/studio/page-header";
import { graphPath, projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { HOMEPAGE_AGENT } from "@/lib/homepage-agent";
import { getActionPorts } from "@/lib/ports";

export async function HomepageAgentVerticalView({
  ctx,
  projectId,
}: {
  ctx: ProjectRouteContext;
  projectId: string;
}) {
  const ports = getActionPorts(projectId);
  const [nodeTypes, edgeTypes, actions, instructions, ...instanceSets] =
    await Promise.all([
      ports.catalog.listNodeCatalogEntries(),
      ports.catalog.listEdgeCatalogEntries(),
      ports.catalog.listActionCatalogEntries(),
      ports.catalog.listInstructions({ limit: 100 }),
      ...HOMEPAGE_AGENT.nodeTypes.map((nodeType) =>
        ports.graph.queryNodes({ nodeType, limit: 20 }),
      ),
    ]);

  const verticalNodes = nodeTypes.filter((n) =>
    (HOMEPAGE_AGENT.nodeTypes as readonly string[]).includes(n.nodeType),
  );
  const verticalEdges = edgeTypes.filter((e) =>
    (HOMEPAGE_AGENT.edgeTypes as readonly string[]).includes(e.edgeType),
  );
  const verticalActions = actions.filter((a) =>
    (HOMEPAGE_AGENT.actions as readonly string[]).includes(a.actionType),
  );
  const workflow = instructions.find(
    (i) => i.title === HOMEPAGE_AGENT.instructionTitle,
  );

  const instancesByType = Object.fromEntries(
    HOMEPAGE_AGENT.nodeTypes.map((nodeType, index) => [
      nodeType,
      instanceSets[index] ?? [],
    ]),
  ) as Record<(typeof HOMEPAGE_AGENT.nodeTypes)[number], (typeof instanceSets)[0]>;

  const totalInstances = Object.values(instancesByType).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={HOMEPAGE_AGENT.label}
        description={HOMEPAGE_AGENT.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embedder integration</CardTitle>
          <CardDescription>
            최종 고객 격리는 <code className="text-xs">properties.subject_id</code>{" "}
            (고객사 A <code className="text-xs">users.id</code>)로 처리합니다. 콘솔은
            운영자 뷰로 subject 필터 없이 전체 인스턴스를 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">BFF: examples/embedder-bff</Badge>
          <Badge variant="outline">BFF → properties.subject_id</Badge>
          <Badge variant="outline">RLS: embedder Supabase</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Graph objects</CardTitle>
            <CardDescription>{verticalNodes.length} types</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relations</CardTitle>
            <CardDescription>{verticalEdges.length} types</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
          <CardTitle className="text-base">Graph actions</CardTitle>
            <CardDescription>{verticalActions.length} contracts</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instances</CardTitle>
            <CardDescription>{totalInstances} rows (all subjects)</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Node catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Subject scoped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verticalNodes.map((node) => (
                <TableRow key={node.nodeType}>
                  <TableCell>
                    <Link
                      href={graphPath(ctx, "nodes", node.slug)}
                      className="font-medium hover:underline"
                    >
                      {node.nodeType}
                    </Link>
                  </TableCell>
                  <TableCell>{node.family}</TableCell>
                  <TableCell>{Object.keys(node.propertySchema).join(", ")}</TableCell>
                  <TableCell>
                    {Object.keys(node.propertySchema).includes("subject_id") ? (
                      <Badge>yes</Badge>
                    ) : (
                      <Badge variant="secondary">no</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Graph actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {verticalActions.map((action) => (
              <div
                key={action.actionType}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <Link
                  href={graphPath(ctx, "nodes")}
                  className="font-medium hover:underline"
                >
                  {action.actionType}
                </Link>
                <Badge variant="outline">{action.executor}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {workflow ? (
              <>
                <p className="font-medium">{workflow.title}</p>
                <p className="text-muted-foreground whitespace-pre-line">
                  {workflow.body}
                </p>
                <Button
                  render={<Link href={projectPath(ctx, "workflows")} />}
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                >
                  Workflows
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Run <code className="text-xs">pnpm db:seed</code> to load the workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {HOMEPAGE_AGENT.nodeTypes.map((nodeType) => {
        const rows = instancesByType[nodeType] ?? [];
        return (
          <Card key={nodeType}>
            <CardHeader>
              <CardTitle className="text-base">{nodeType} instances</CardTitle>
              <CardDescription>
                Operator view — includes all subjects. Embedder MCP queries filter by
                subject_id.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No instances yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>subject_id</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.id}</TableCell>
                        <TableCell>
                          {String(row.properties.title ?? "—")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {String(row.properties.subject_id ?? "—")}
                        </TableCell>
                        <TableCell>{row.lifecycleStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
