"use client";

import { useState } from "react";
import { CheckIcon, TrayIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Card } from "@ssota/ui/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ssota/ui/components/ui/empty";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import { cn } from "@ssota/ui/lib/utils";
import { useAction } from "../context";
import { boundNodes } from "../bindings";
import { flowColorClasses, type FlowColorToken } from "../flow-tokens";
import type { CatalogComponent, RenderNode } from "../types";

/** Read `"title"` or a node property, domain-agnostic (matches DataTable's readCell). */
function readField(node: RenderNode, field: string): unknown {
  return field === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[field];
}

/**
 * Map a free-text status value onto one of the shared FlowColorToken buckets, so
 * the status chip reuses the allowlisted flow-token class map (R7) instead of
 * hardcoding a palette. Unknown values fall back to a neutral gray.
 */
function statusToken(status: string): FlowColorToken {
  const s = status.trim().toLowerCase();
  if (
    [
      "approved",
      "approve",
      "done",
      "validated",
      "completed",
      "complete",
      "merged",
      "resolved",
      "accepted",
      "paid",
    ].includes(s)
  )
    return "green";
  if (
    [
      "rejected",
      "reject",
      "denied",
      "declined",
      "failed",
      "blocked",
      "cancelled",
      "canceled",
    ].includes(s)
  )
    return "red";
  if (
    [
      "pending",
      "review",
      "in_review",
      "in-review",
      "waiting",
      "submitted",
      "requested",
      "draft",
      "todo",
      "open",
    ].includes(s)
  )
    return "amber";
  if (["active", "in_progress", "in-progress", "doing", "processing"].includes(s))
    return "blue";
  return "gray";
}

function StatusBadge({ status }: { status: string }) {
  const classes = flowColorClasses(statusToken(status));
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border capitalize",
        classes.surface,
        classes.border,
        classes.text,
      )}
    >
      {status}
    </Badge>
  );
}

type Busy = { id: string; kind: "approve" | "reject" };

function ApprovalInboxEl({
  nodes,
  titleField,
  metaFields,
  statusField,
  approveAction,
  rejectAction,
  approveLabel,
  rejectLabel,
}: {
  nodes: RenderNode[];
  titleField: string;
  metaFields: string[];
  statusField: string;
  approveAction?: string;
  rejectAction?: string;
  approveLabel: string;
  rejectLabel: string;
}) {
  const onAction = useAction();
  const [busy, setBusy] = useState<Busy | null>(null);

  const dispatch = async (
    node: RenderNode,
    kind: "approve" | "reject",
    actionKey: string | undefined,
    value: "approved" | "rejected",
  ) => {
    if (!onAction || !actionKey) return;
    setBusy({ id: node.id, kind });
    try {
      await onAction(actionKey, { nodeId: node.id, value });
    } finally {
      setBusy(null);
    }
  };

  if (nodes.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrayIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>승인 대기 항목이 없습니다</EmptyTitle>
          <EmptyDescription>
            새 요청이 들어오면 여기에서 승인하거나 반려할 수 있습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {nodes.map((node) => {
        const title = String(readField(node, titleField) ?? node.title ?? "");
        const statusRaw = readField(node, statusField);
        const status = statusRaw == null ? "" : String(statusRaw);
        const meta = metaFields
          .map((f) => readField(node, f))
          .filter((v) => v != null && v !== "")
          .map((v) => String(v))
          .join(" · ");

        const rowBusy = busy?.id === node.id;
        const canApprove = !!onAction && !!approveAction;
        const canReject = !!onAction && !!rejectAction;

        return (
          <Card
            key={node.id}
            className="flex-row items-center gap-3 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {title || "제목 없음"}
                </span>
                {status ? <StatusBadge status={status} /> : null}
              </div>
              {meta ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {meta}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canReject || rowBusy}
                onClick={() =>
                  void dispatch(node, "reject", rejectAction, "rejected")
                }
              >
                {rowBusy && busy?.kind === "reject" ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <XIcon className="size-3.5" />
                )}
                {rejectLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canApprove || rowBusy}
                onClick={() =>
                  void dispatch(node, "approve", approveAction, "approved")
                }
              >
                {rowBusy && busy?.kind === "approve" ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CheckIcon className="size-3.5" />
                )}
                {approveLabel}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * ApprovalInbox — a pending-approval queue. Encapsulates the approve/reject
 * pattern agents currently hand-assemble from an editable status badge + action:
 * each bound node renders as a row with title, meta, a status chip, and
 * Approve / Reject buttons that dispatch `{ nodeId, value }` (wire to
 * `update_node` / `set_node_property` via `{$input:"nodeId"}` / `{$input:"value"}`).
 */
export const approvalComponents: Record<string, CatalogComponent> = {
  ApprovalInbox: ({ props, bindingData }) => (
    <ApprovalInboxEl
      nodes={boundNodes(bindingData, props)}
      titleField={typeof props.titleField === "string" ? props.titleField : "title"}
      metaFields={
        Array.isArray(props.metaFields)
          ? (props.metaFields as unknown[]).filter(
              (f): f is string => typeof f === "string",
            )
          : []
      }
      statusField={
        typeof props.statusField === "string" ? props.statusField : "status"
      }
      approveAction={
        typeof props.approveAction === "string" ? props.approveAction : undefined
      }
      rejectAction={
        typeof props.rejectAction === "string" ? props.rejectAction : undefined
      }
      approveLabel={
        typeof props.approveLabel === "string" ? props.approveLabel : "승인"
      }
      rejectLabel={
        typeof props.rejectLabel === "string" ? props.rejectLabel : "반려"
      }
    />
  ),
};
