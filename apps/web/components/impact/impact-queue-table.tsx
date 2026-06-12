"use client";

import { useState } from "react";
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
import { ImpactStatusBadge } from "@/components/impact/impact-status-badge";
import {
  formatNodeRef,
  type SerializedImpactQueueItem,
} from "@/lib/impact/serialize";

type ImpactQueueTableProps = {
  items: SerializedImpactQueueItem[];
  labels: {
    created: string;
    workflow: string;
    route: string;
    status: string;
    attempts: string;
    worker: string;
    runAt: string;
    detailTitle: string;
    detailDescription: string;
    provenance: string;
    runtime: string;
    data: string;
    empty: string;
    emptyFiltered: string;
  };
  isFiltered: boolean;
};

export function ImpactQueueTable({
  items,
  labels,
  isFiltered,
}: ImpactQueueTableProps) {
  const [selected, setSelected] = useState<SerializedImpactQueueItem | null>(
    null,
  );

  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        {isFiltered ? labels.emptyFiltered : labels.empty}
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.created}</TableHead>
            <TableHead>{labels.workflow}</TableHead>
            <TableHead>{labels.route}</TableHead>
            <TableHead>{labels.status}</TableHead>
            <TableHead>{labels.attempts}</TableHead>
            <TableHead>{labels.worker}</TableHead>
            <TableHead>{labels.runAt}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => setSelected(item)}
            >
              <TableCell className="text-muted-foreground">
                {item.createdAt}
              </TableCell>
              <TableCell className="font-medium">{item.workflowKey}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatNodeRef(item.sourceNodeId, item.payload.sourceNodeType)}{" "}
                →{" "}
                {formatNodeRef(item.targetNodeId, item.payload.targetNodeType)}
              </TableCell>
              <TableCell>
                <ImpactStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                {item.attemptCount}/{item.maxAttempts}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.status === "running" ? (item.lockedBy ?? "-") : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.runAt}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{labels.detailTitle}</SheetTitle>
                <SheetDescription>{labels.detailDescription}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div>
                  <div className="mb-2 text-sm font-medium">
                    {labels.provenance}
                  </div>
                  <dl className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="text-foreground">workflowKey:</span>{" "}
                      {selected.workflowKey}
                    </div>
                    <div>
                      <span className="text-foreground">sourceActionLogId:</span>{" "}
                      {selected.sourceActionLogId}
                    </div>
                    <div>
                      <span className="text-foreground">dependencyEdgeId:</span>{" "}
                      {selected.dependencyEdgeId ?? "-"}
                    </div>
                    <div>
                      <span className="text-foreground">instructionId:</span>{" "}
                      {selected.instructionId ?? "-"}
                    </div>
                  </dl>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">{labels.runtime}</div>
                  <dl className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">status:</span>
                      <ImpactStatusBadge status={selected.status} />
                    </div>
                    <div>
                      <span className="text-foreground">priority:</span>{" "}
                      {selected.priority}
                    </div>
                    <div>
                      <span className="text-foreground">runAt:</span>{" "}
                      {selected.runAt}
                    </div>
                    <div>
                      <span className="text-foreground">lockedUntil:</span>{" "}
                      {selected.lockedUntil ?? "-"}
                    </div>
                    <div>
                      <span className="text-foreground">attempts:</span>{" "}
                      {selected.attemptCount}/{selected.maxAttempts}
                    </div>
                    <div>
                      <span className="text-foreground">lastError:</span>{" "}
                      {selected.lastError ?? "-"}
                    </div>
                  </dl>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">{labels.data}</div>
                  <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                    {JSON.stringify(
                      { payload: selected.payload, result: selected.result },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
