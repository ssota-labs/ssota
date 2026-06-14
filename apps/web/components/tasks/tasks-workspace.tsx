"use client";

import Link from "next/link";
import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";

export type TaskFilter = "all" | "human" | "agent" | "automation" | "blocked" | "review";

export type TaskWorkspaceRow = {
  id: string;
  title: string;
  lifecycleStatus: string;
  status: string;
  assignee: string;
  workflowType: string;
  instructionKey: string;
  targetNodeId: string;
  acceptanceCriteria: string[];
  notionUrl: string;
  lockOwner: string;
  lockExpiresAt: string;
  content: string;
  updatedAt: string;
  rawProperties: Record<string, unknown>;
};

type TasksWorkspaceProps = {
  rows: TaskWorkspaceRow[];
  activeFilter: TaskFilter;
  baseHref: string;
  graphTaskHref: string;
};

const filterLabels: Record<TaskFilter, string> = {
  all: "All",
  human: "Human",
  agent: "Agent",
  automation: "Automation",
  blocked: "Blocked",
  review: "Review",
};

export function TasksWorkspace({
  rows,
  activeFilter,
  baseHref,
  graphTaskHref,
}: TasksWorkspaceProps) {
  const [selected, setSelected] = useState<TaskWorkspaceRow | null>(null);
  const filtered = rows.filter((row) => matchesFilter(row, activeFilter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as TaskFilter[]).map((filter) => (
          <Button
            key={filter}
            render={
              <Link
                href={filter === "all" ? baseHref : `${baseHref}?view=${filter}`}
                scroll={false}
              />
            }
            variant={activeFilter === filter ? "default" : "outline"}
            size="sm"
            nativeButton={false}
          >
            {filterLabels[filter]}{" "}
            <Badge variant="secondary">{rows.filter((row) => matchesFilter(row, filter)).length}</Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Work queue</CardTitle>
            <CardDescription>
              Task rows interpreted as human, agent, and automation work.
            </CardDescription>
          </div>
          <Button
            render={<Link href={graphTaskHref} />}
            variant="outline"
            size="sm"
            nativeButton={false}
          >
            Advanced table
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="space-y-3 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No Tasks match this view yet. Create Task nodes through an action
                contract or open the advanced table.
              </p>
              <Button
                render={<Link href={graphTaskHref} />}
                variant="outline"
                size="sm"
                nativeButton={false}
              >
                Open Task table
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.assignee}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.workflowType}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.targetNodeId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.updatedAt.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(row)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  Task detail, workflow routing, output links, and lock state.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <DetailGroup
                  title="Routing"
                  rows={[
                    ["status", selected.status],
                    ["assignee", selected.assignee],
                    ["workflow_type", selected.workflowType],
                    ["instruction_key", selected.instructionKey],
                    ["target_node_id", selected.targetNodeId],
                  ]}
                />
                <DetailGroup
                  title="Lock"
                  rows={[
                    ["lock_owner", selected.lockOwner],
                    ["lock_expires_at", selected.lockExpiresAt],
                  ]}
                />
                <div>
                  <div className="mb-2 text-sm font-medium">Acceptance criteria</div>
                  {selected.acceptanceCriteria.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {selected.acceptanceCriteria.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No acceptance criteria declared.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Notion output</div>
                  {selected.notionUrl ? (
                    <Button
                      render={<Link href={selected.notionUrl} target="_blank" />}
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                    >
                      Open Notion page
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No `canonical_url` or Notion URL property yet.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Content</div>
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    {selected.content || "No content."}
                  </p>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Raw properties</div>
                  <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selected.rawProperties, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function matchesFilter(row: TaskWorkspaceRow, filter: TaskFilter) {
  if (filter === "all") return true;
  const assignee = row.assignee.toLowerCase();
  const status = row.status.toLowerCase();
  if (filter === "blocked") return status.includes("blocked");
  if (filter === "review") return status.includes("review") || status.includes("gate");
  if (filter === "automation") {
    return assignee.includes("automation") || Boolean(row.workflowType);
  }
  return assignee.includes(filter);
}

function DetailGroup({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-all">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
