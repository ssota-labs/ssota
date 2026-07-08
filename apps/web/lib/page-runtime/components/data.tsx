"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { readNodeContent } from "@ssota/core";
import {
  ArrowsDownUpIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CopyIcon,
  FileDashedIcon,
  FileTextIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAction, useBasePath } from "../context";
import { boundNode, boundNodes } from "../bindings";
import { readNodeField } from "./roadmap-doc-card";
import { DocumentStatusBadge } from "./document-status-badge";
import type { CatalogComponent, RenderNode } from "../types";

/** Column of a NodeTable. `type` drives cell rendering + sort comparison. */
type NodeTableColumn = {
  key: string;
  header: string;
  type?: "text" | "badge" | "date";
};

/** Read a cell value from a node by column key ("title" or a property). */
function readCell(node: RenderNode, key: string): unknown {
  return key === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)[key];
}

/** Deterministic, locale-free date format (YYYY-MM-DD) — no hydration drift. */
function formatDate(value: unknown): string {
  if (value == null || value === "") return "";
  const date = new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

/** Shared empty state (icon + message + optional CTA) on the Empty primitive. */
function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="border-border rounded-lg border border-dashed py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}

/** Card-style list of nodes: title link + status badge + catalogKey badge. */
function NodeListEl({
  nodes,
  title,
  statusField = "lifecycleStatus",
  rowHref,
  emptyLabel,
  emptyAction,
  emptyActionLabel,
}: {
  nodes: RenderNode[];
  title?: string;
  statusField?: string;
  rowHref?: string;
  emptyLabel?: string;
  emptyAction?: string;
  emptyActionLabel?: string;
}) {
  const basePath = useBasePath();
  const onAction = useAction();

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      {nodes.length === 0 ? (
        <EmptyState
          icon={<FileDashedIcon />}
          title="표시할 항목이 없습니다"
          description={emptyLabel}
        >
          {emptyAction && emptyActionLabel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!onAction}
              onClick={() => onAction?.(emptyAction, {})}
            >
              <PlusIcon className="size-3.5" />
              {emptyActionLabel}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {nodes.map((node) => {
            const status = readNodeField(node, statusField);
            return (
              <li
                key={node.id}
                className="border-border bg-card hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileTextIcon
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0 truncate">
                    {rowHref ? (
                      <Link
                        href={`${basePath}/${rowHref}/${node.id}`}
                        className="text-foreground text-sm font-medium hover:underline"
                      >
                        {node.title}
                      </Link>
                    ) : (
                      <span className="text-foreground text-sm font-medium">
                        {node.title}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {status ? <DocumentStatusBadge status={status} /> : null}
                  <Badge variant="outline" className="font-normal">
                    {node.catalogKey}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Table of nodes with client-side header sorting + typed cell rendering. */
function NodeTableEl({
  nodes,
  columns,
  rowHref,
  title,
  emptyLabel,
}: {
  nodes: RenderNode[];
  columns: NodeTableColumn[];
  rowHref?: string;
  title?: string;
  emptyLabel?: string;
}) {
  const basePath = useBasePath();
  const cols: NodeTableColumn[] = useMemo(
    () => (columns.length ? columns : [{ key: "title", header: "Title" }]),
    [columns],
  );
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null,
  );

  const sortedNodes = useMemo(() => {
    if (!sort) return nodes;
    const type = cols.find((c) => c.key === sort.key)?.type ?? "text";
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...nodes].sort((a, b) => {
      const av = readCell(a, sort.key);
      const bv = readCell(b, sort.key);
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      // Empty cells always sort last, regardless of direction.
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
      if (type === "date") {
        return (
          (new Date(String(av)).getTime() - new Date(String(bv)).getTime()) *
          factor
        );
      }
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [nodes, sort, cols]);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null,
    );

  const renderCell = (node: RenderNode, col: NodeTableColumn, isFirst: boolean) => {
    const raw = readCell(node, col.key);
    if (isFirst && rowHref) {
      const label = raw == null || raw === "" ? node.title : String(raw);
      return (
        <Link
          href={`${basePath}/${rowHref}/${node.id}`}
          className="text-foreground font-medium hover:underline"
        >
          {label}
        </Link>
      );
    }
    if (raw == null || raw === "") {
      return <span className="text-muted-foreground">—</span>;
    }
    if (col.type === "badge") return <DocumentStatusBadge status={String(raw)} />;
    if (col.type === "date") return <span>{formatDate(raw)}</span>;
    return <span>{String(raw)}</span>;
  };

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      {sortedNodes.length === 0 ? (
        <EmptyState
          icon={<FileDashedIcon />}
          title="표시할 항목이 없습니다"
          description={emptyLabel}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <TableHead key={c.key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      aria-label={`Sort by ${c.header}`}
                      className="text-muted-foreground hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 font-medium"
                    >
                      {c.header}
                      {active && sort ? (
                        sort.dir === "asc" ? (
                          <CaretUpIcon className="size-3" aria-hidden />
                        ) : (
                          <CaretDownIcon className="size-3" aria-hidden />
                        )
                      ) : (
                        <ArrowsDownUpIcon
                          className="size-3 opacity-40"
                          aria-hidden
                        />
                      )}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNodes.map((node) => (
              <TableRow key={node.id}>
                {cols.map((c, i) => (
                  <TableCell key={c.key}>
                    {renderCell(node, c, i === 0)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** A label/value pair with a copy-to-clipboard affordance. */
function NodeFieldEl({
  label,
  value,
  copyable = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const hasValue = value.length > 0;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  };
  return (
    <div className="group/field flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        {label ? (
          <div className="text-muted-foreground text-xs font-medium">
            {label}
          </div>
        ) : null}
        <div className="text-foreground text-sm break-words">
          {hasValue ? value : <span className="text-muted-foreground">—</span>}
        </div>
      </div>
      {copyable && hasValue ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={copied ? "복사됨" : "값 복사"}
          className="text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover/field:opacity-100 focus-visible:opacity-100"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </Button>
      ) : null}
    </div>
  );
}

/** Reads a bound node's `content` (BlockNote → markdown) as read text. */
function NodeDocumentEl({
  content,
  title,
}: {
  content: string | null;
  title?: string;
}) {
  const body = content?.trim() ?? "";
  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      {body ? (
        <div className="border-border bg-card rounded-md border p-4">
          <div className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
            {body}
          </div>
        </div>
      ) : (
        <EmptyState icon={<FileTextIcon />} title="내용 없음" />
      )}
    </div>
  );
}

/** Resolve `props.binding` to a single node (arrays use the first row). */
function resolveNode(
  bindingData: Record<string, unknown>,
  props: Record<string, unknown>,
): RenderNode | undefined {
  const raw = typeof props.binding === "string" ? bindingData[props.binding] : undefined;
  if (Array.isArray(raw)) return raw[0] as RenderNode | undefined;
  if (raw && typeof raw === "object" && "id" in raw) return raw as RenderNode;
  return boundNode(bindingData, props);
}

/** Components that read graph data via bindings. */
export const dataComponents: Record<string, CatalogComponent> = {
  NodeList: ({ props, bindingData }) => (
    <NodeListEl
      nodes={boundNodes(bindingData, props)}
      title={props.title ? String(props.title) : undefined}
      statusField={
        typeof props.statusField === "string" ? props.statusField : undefined
      }
      rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
      emptyLabel={
        typeof props.emptyLabel === "string" ? props.emptyLabel : undefined
      }
      emptyAction={
        typeof props.emptyAction === "string" ? props.emptyAction : undefined
      }
      emptyActionLabel={
        typeof props.emptyActionLabel === "string"
          ? props.emptyActionLabel
          : undefined
      }
    />
  ),
  NodeTable: ({ props, bindingData }) => (
    <NodeTableEl
      nodes={boundNodes(bindingData, props)}
      columns={
        Array.isArray(props.columns) ? (props.columns as NodeTableColumn[]) : []
      }
      rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
      title={props.title ? String(props.title) : undefined}
      emptyLabel={
        typeof props.emptyLabel === "string" ? props.emptyLabel : undefined
      }
    />
  ),
  NodeField: ({ props, bindingData }) => {
    const field = typeof props.field === "string" ? props.field : undefined;
    const label = String(props.label ?? "");
    let value = props.value;
    if (typeof props.binding === "string") {
      const node = resolveNode(bindingData, props);
      if (field && node) {
        value = readNodeField(node, field);
      } else if (node && !field) {
        value = node.title;
      }
    }
    return (
      <NodeFieldEl
        label={label}
        value={value == null ? "" : String(value)}
        copyable={props.copyable !== false}
      />
    );
  },
  NodeDocument: ({ props, bindingData }) => {
    const node = resolveNode(bindingData, props);
    return (
      <NodeDocumentEl
        content={node ? readNodeContent(node.properties) : null}
        title={props.title ? String(props.title) : undefined}
      />
    );
  },
};
