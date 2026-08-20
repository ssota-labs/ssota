"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionCatalogRow, NodeCatalogRow } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ssota/ui/components/ui/sheet";
import { cn } from "@ssota/ui/lib/utils";
import {
  loadRecord,
  runActionFromConsole,
} from "@/app/[orgSlug]/[teamspaceSlug]/data/actions";
import { ActionForm, type NodeOption } from "./action-form";

/**
 * Data 워크스페이스 — Supabase Table Editor식 데이터 열람 + 액션 실행.
 * 좌: 타입별 카운트 explorer / 우: 선택 타입의 DataTable, 행 클릭 → RecordView 시트.
 * 쓰기는 액션 버튼(폼)뿐이다 — 셀 인라인 편집은 두지 않는다 [ACTION-01].
 */

export interface DataRow {
  id: string;
  title: string;
  catalogKey: string;
  properties: Record<string, unknown>;
  updatedAt: string;
}

export interface TypeSummary {
  catalogKey: string;
  label: string;
  count: number;
}

type RecordDetail = Awaited<ReturnType<typeof loadRecord>>;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DataWorkspace({
  orgSlug,
  teamspaceSlug,
  types,
  summaries,
  activeType,
  rows,
  actions,
  nodeOptions,
  paramTypesByAction,
}: {
  orgSlug: string;
  teamspaceSlug: string;
  types: NodeCatalogRow[];
  summaries: TypeSummary[];
  activeType: NodeCatalogRow | null;
  rows: DataRow[];
  actions: ActionCatalogRow[];
  nodeOptions: NodeOption[];
  /** actionKey → (파라미터명 → 허용 객체 타입 키). 액션 편집에서 유도된다. */
  paramTypesByAction: Record<string, Record<string, string[]>>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeAction, setActiveAction] = useState<ActionCatalogRow | null>(null);
  const [record, setRecord] = useState<RecordDetail>(null);
  const [, startRecord] = useTransition();

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withCounts = types.map((t) => ({
      type: t,
      count: summaries.find((s) => s.catalogKey === t.key)?.count ?? 0,
    }));
    if (!q) return withCounts;
    return withCounts.filter(({ type }) =>
      type.label.toLowerCase().includes(q) || type.key.toLowerCase().includes(q),
    );
  }, [types, summaries, query]);

  const columns = useMemo(() => {
    const declared = Object.keys(activeType?.propertySchema?.properties ?? {});
    if (declared.length) return declared;
    const seen = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r.properties)) seen.add(k);
    return [...seen].slice(0, 8);
  }, [activeType, rows]);

  /** 이 타입을 건드리는 액션만 노출한다 — writes 선언이 곧 노출 규칙이다. */
  const relevantActions = useMemo(() => {
    if (!activeType) return actions;
    return actions.filter((a) => a.writes.includes(activeType.key) || a.writes.includes("*"));
  }, [actions, activeType]);

  return (
    <div className="flex h-full min-h-0" data-testid="data-workspace">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-background" data-testid="data-explorer">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search types…"
            className="h-7 text-xs"
            aria-label="Search object types"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Objects
          </p>
          {filteredTypes.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No object types. Define them in Ontology.
            </p>
          ) : null}
          <ul>
            {filteredTypes.map(({ type, count }) => (
              <li key={type.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/${orgSlug}/data?type=${encodeURIComponent(type.key)}`)}
                  className={cn(
                    "flex h-7 w-full items-center gap-2 px-3 text-left text-xs hover:bg-muted",
                    activeType?.key === type.key && "bg-muted font-medium",
                  )}
                  data-testid="data-explorer-item"
                  data-catalog-key={type.key}
                  title={type.key}
                >
                  <span className="truncate">{type.label}</span>
                  <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">{count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {activeType ? activeType.label : "Data"}
            </h1>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {activeType ? `${activeType.key} · ${rows.length} rows` : "Pick an object type"}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1">
            {relevantActions.map((a) => (
              <Button key={a.id} size="xs" variant="outline" onClick={() => setActiveAction(a)}>
                {a.label}
              </Button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {!activeType ? (
            <p className="p-6 text-sm text-muted-foreground">
              Select an object type on the left to browse its records.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No records yet. Run an action above to create one.
            </p>
          ) : (
            <table className="w-full text-xs" data-testid="data-table">
              <thead className="sticky top-0 bg-muted/70 text-muted-foreground backdrop-blur">
                <tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium">
                  <th className="w-56">Title</th>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th className="w-36">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-t hover:bg-muted/50 [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-1.5"
                    data-testid="data-row"
                    onClick={() =>
                      startRecord(async () => setRecord(await loadRecord(orgSlug, teamspaceSlug, r.id)))
                    }
                  >
                    <td className="font-medium">{r.title}</td>
                    {columns.map((c) => (
                      <td key={c} className="max-w-56 truncate text-muted-foreground">
                        {formatCell(r.properties[c])}
                      </td>
                    ))}
                    <td className="text-muted-foreground">{r.updatedAt.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Sheet open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>{activeAction?.label}</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {activeAction ? (
              <ActionForm
                action={activeAction}
                nodeOptions={nodeOptions}
                paramNodeTypes={paramTypesByAction[activeAction.key] ?? {}}
                onRun={(parameters, idempotencyKey) =>
                  runActionFromConsole(orgSlug, teamspaceSlug, {
                    actionKey: activeAction.key,
                    parameters,
                    idempotencyKey,
                  })
                }
                onDone={() => {
                  router.refresh();
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!record} onOpenChange={(open) => !open && setRecord(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg" data-testid="record-view">
          <SheetHeader className="border-b">
            <SheetTitle>{record?.node.title}</SheetTitle>
          </SheetHeader>
          {record ? (
            <div className="space-y-4 p-4 text-xs">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Properties</p>
                <dl className="rounded-md border">
                  {Object.entries(record.node.properties).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 border-b px-3 py-1.5 last:border-b-0">
                      <dt className="font-mono text-[11px] text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-words">{formatCell(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Links ({record.edges.length})</p>
                {record.edges.length === 0 ? (
                  <p className="text-muted-foreground">No links.</p>
                ) : (
                  <ul className="space-y-1">
                    {record.edges.map((e) => {
                      const outgoing = e.sourceNodeId === record.node.id;
                      const otherId = outgoing ? e.targetNodeId : e.sourceNodeId;
                      const other = record.titles[otherId];
                      return (
                        <li key={e.id} className="flex items-center gap-2 rounded border px-2 py-1">
                          <Badge variant="secondary" className="text-[10px]">{outgoing ? "→" : "←"}</Badge>
                          <span className="truncate">{e.catalogLabel}</span>
                          <span className="ml-auto truncate text-muted-foreground">
                            {other ? `${other.title} · ${other.catalogLabel}` : otherId.slice(0, 8)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
