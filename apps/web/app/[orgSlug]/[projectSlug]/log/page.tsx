import { OutcomeBadge } from "@/components/outcome-badge";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@loopos/ui/components/ui/table";

export default async function LogPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  await params;
  const ports = getActionPorts();
  const log = await ports.commit.getActionLog({ limit: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Log"
        description="모든 executeAction 커밋·게이트·거부 이벤트의 감사 타임라인입니다."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            Outcome badges reflect committed, gated, or rejected runtime decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>액션</TableHead>
                <TableHead>scope</TableHead>
                <TableHead>instruction</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>실행자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {entry.createdAt.toISOString()}
                  </TableCell>
                  <TableCell className="font-medium">{entry.actionType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatScope(entry.metadata.scope ?? entry.input.scope)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {String(
                      entry.metadata.instructionRunId ??
                        entry.metadata.instructionId ??
                        "-",
                    )}
                  </TableCell>
                  <TableCell>
                    <OutcomeBadge outcome={entry.outcome} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.executorType}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatScope(scope: unknown) {
  if (!scope || typeof scope !== "object") return "-";
  const value = scope as Record<string, unknown>;
  if (value.kind === "node_type") return `node:${String(value.nodeType)}`;
  if (value.kind === "edge_type") return `edge:${String(value.edgeType)}`;
  if (value.kind === "property") {
    return `property:${String(value.nodeType)}.${String(value.propertyKey)}`;
  }
  if (value.kind === "instruction") {
    return `instruction:${String(value.title ?? value.instructionId ?? "*")}`;
  }
  if (value.kind === "global") return "global";
  return "-";
}
