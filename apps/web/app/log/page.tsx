import { redirect } from "next/navigation";
import { OutcomeBadge } from "@/components/outcome-badge";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";

export default async function LogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const log = await ports.commit.getActionLog({ limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Runs</h1>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시간</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>scope</TableHead>
              <TableHead>workflow</TableHead>
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
                  {String(entry.metadata.instructionRunId ?? entry.metadata.instructionId ?? "-")}
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
      </div>
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
