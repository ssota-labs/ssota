"use client";

import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { getToolTraceLabelKey } from "@/lib/chat/tool-trace-labels";

export interface ToolInfo {
  name: string;
  input?: unknown;
  output?: unknown;
  state: string;
  errorText?: string | undefined;
}

type Category = "edit" | "read" | "search" | "run" | "other";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** 툴 이름 → 요약 카테고리 매핑 (연속 호출을 행동별로 집계). */
const CATEGORY_BY_TOOL: Record<string, Category> = {
  // edit
  create_node: "edit",
  update_node: "edit",
  create_edge: "edit",
  create_page: "edit",
  update_page: "edit",
  write_agent_definition: "edit",
  sandbox_write_file: "edit",
  // read
  get_node: "read",
  get_node_type: "read",
  get_edge_type: "read",
  read_page: "read",
  get_page_component: "read",
  get_task: "read",
  get_agent_instruction: "read",
  describe_worker: "read",
  sandbox_read_file: "read",
  // search
  search_catalog: "search",
  query_nodes: "search",
  query_tasks: "search",
  traverse_edges: "search",
  list_node_types: "search",
  list_edge_types: "search",
  list_page_components: "search",
  list_pages: "search",
  list_agent_definitions: "search",
  list_workers: "search",
  connection_search: "search",
  COMPOSIO_SEARCH_TOOLS: "search",
  COMPOSIO_GET_TOOL_SCHEMAS: "search",
  // run
  sandbox_exec: "run",
  run_worker: "run",
  delegate: "run",
  spawn_task: "run",
  update_task: "run",
  complete_task: "run",
  block_task: "run",
  request_approval: "run",
  connection_call: "run",
  COMPOSIO_MULTI_EXECUTE_TOOL: "run",
  COMPOSIO_MANAGE_CONNECTIONS: "run",
};

/** 인자에서 사람이 읽을 detail 을 뽑는다 (경로·패턴·명령·질의 순). */
const DETAIL_KEYS = [
  "path",
  "pattern",
  "cmd",
  "command",
  "query",
  "nodeType",
  "type",
  "tool",
  "name",
  "title",
  "id",
];

function field(input: unknown, key: string): string {
  if (input && typeof input === "object" && key in input) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return "";
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function detailOf(input: unknown): string {
  for (const key of DETAIL_KEYS) {
    const v = field(input, key);
    if (v) return truncate(v, 64);
  }
  return "";
}

function categoryOf(name: string): Category {
  return CATEGORY_BY_TOOL[name] ?? "other";
}

/** 툴 이름 → i18n 행동 라벨 (tool-trace-labels 소스 재사용). */
function labelOf(name: string, t: Translate): string {
  const labelKey = getToolTraceLabelKey(name);
  if (labelKey) return t(`chat.toolTrace.labels.${labelKey}`);
  return t("chat.toolTrace.fallback", { toolName: name });
}

/** 카테고리별 카운트를 Cursor 형 요약 문장으로. */
function summarize(tools: ToolInfo[], t: Translate): string {
  const c: Record<Category, number> = { edit: 0, read: 0, search: 0, run: 0, other: 0 };
  for (const tool of tools) c[categoryOf(tool.name)] += 1;
  const parts: string[] = [];
  if (c.edit) parts.push(t("chat.toolGroup.edit", { count: c.edit }));
  if (c.read) parts.push(t("chat.toolGroup.read", { count: c.read }));
  if (c.search) parts.push(t("chat.toolGroup.search", { count: c.search }));
  if (c.run) parts.push(t("chat.toolGroup.run", { count: c.run }));
  if (c.other) parts.push(t("chat.toolGroup.other", { count: c.other }));
  return parts.join(", ") || t("chat.toolGroup.fallback", { count: tools.length });
}

function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 연속된 도구 호출을 접히는 그룹으로 묶는다 (Cursor 형 요약).
 * 헤더: 행동별 요약 + 우측 끝 캐럿. 펼치면 항목 목록 — 각 항목도 개별 아코디언(출력 표시).
 * 기본 접힘 + 실행 중 스피너, 에러 시 자동 펼침.
 */
export function ToolGroup({ tools }: { tools: ToolInfo[] }) {
  const { t } = useLocale();
  const inProgress = tools.some(
    (tool) => tool.state === "input-streaming" || tool.state === "input-available",
  );
  const erroredCount = tools.filter(
    (tool) =>
      tool.state === "output-error" || tool.state === "output-denied" || tool.errorText,
  ).length;
  const summary = summarize(tools, t);

  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? erroredCount > 0;

  return (
    <div className="text-xs">
      <button
        type="button"
        data-testid="tool-group"
        onClick={() => setManualOpen(!open)}
        className="group flex w-full items-center gap-1.5 py-1 text-left text-muted-foreground outline-none"
      >
        <span className="min-w-0 truncate">{summary}</span>
        {inProgress ? (
          <Spinner className="size-3 shrink-0" />
        ) : erroredCount > 0 ? (
          <span className="shrink-0 text-destructive">
            {t("chat.toolGroup.errored", { count: erroredCount })}
          </span>
        ) : null}
        <CaretRightIcon
          className={cn(
            "size-3 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100",
            open && "rotate-90 opacity-100",
          )}
        />
      </button>

      {open ? (
        <div className="mt-0.5 space-y-px pl-1">
          {tools.map((tool, i) => (
            <ToolItem
              key={i}
              action={labelOf(tool.name, t)}
              detail={detailOf(tool.input)}
              tool={tool}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 그룹 안의 단일 도구 — 헤더(행동+제목) + 펼치면 출력. 에이전트 제목(input.title) 우선. */
function ToolItem({
  action,
  detail,
  tool,
}: {
  action: string;
  detail: string;
  tool: ToolInfo;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const errored =
    tool.state === "output-error" || tool.state === "output-denied" || !!tool.errorText;
  const title = field(tool.input, "title");
  const primary = title || detail;
  const body = errored ? tool.errorText ?? stringify(tool.output) : stringify(tool.output);
  const hasBody = body.trim().length > 0;

  return (
    <div data-testid={`tool-trace-${tool.name}`}>
      <button
        type="button"
        disabled={!hasBody}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-1 py-0.5 text-left outline-none"
      >
        <span className="min-w-0 truncate text-muted-foreground">
          <span>{action}</span>
          {primary ? <span className="ml-1 text-foreground/80">{primary}</span> : null}
          {errored ? (
            <span className="ml-1 text-destructive">— {t("chat.toolGroup.error")}</span>
          ) : null}
        </span>
        {hasBody ? (
          <CaretRightIcon
            className={cn(
              "size-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100",
              open && "rotate-90 opacity-100",
            )}
          />
        ) : null}
      </button>
      {open && hasBody ? (
        <pre
          className={cn(
            "mt-0.5 ml-2 max-h-64 overflow-auto rounded bg-muted/50 p-2 text-[0.7rem] leading-relaxed whitespace-pre-wrap break-words",
            errored ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {truncate(body, 4000)}
        </pre>
      ) : null}
    </div>
  );
}
