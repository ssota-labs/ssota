import { redirect } from "next/navigation";
import { OutcomeBadge } from "@/components/outcome-badge";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@loopos/ui/components/ui/table";

export default async function LogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const log = await ports.commit.getActionLog({ limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Action Log</h1>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시간</TableHead>
              <TableHead>액션</TableHead>
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
