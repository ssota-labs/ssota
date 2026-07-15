import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  graphTaskStatusSchema,
  hypothesisStatusSchema,
  pageWireframeStatusSchema,
  pullRequestStatusSchema,
  releaseStatusSchema,
  sprintStatusSchema,
  testPlanStatusSchema,
} from "../catalog/node-types.js";
import {
  goalHealthStatusSchema,
  kpiStatusSchema,
} from "../catalog/goal-schemas.js";
import { pageRecordSchema } from "./page-runtime-schema.js";
import { isKnownPageComponent } from "./page-component-catalog.js";

/**
 * SWDL pages-tree ↔ 스키마 enum anti-drift 가드.
 *
 * 페이지 spec의 status select/badge options, KanbanBoard 컬럼 value,
 * ApprovalInbox approveValue/rejectValue는 해당 catalogKey property 스키마
 * enum의 스냅샷(복제)이다. 스키마 enum이 바뀌었는데 페이지를 갱신하지 않으면
 * 셀 편집/드롭 시 존재하지 않는 상태를 쓰거나(검증 실패), 실제 상태가 UI에서
 * 보이지 않게 드리프트한다. 이 테스트는 pages-tree.json의 모든 status 사용처가
 * 스키마 enum의 부분집합임을 강제한다.
 */

type Column = {
  key?: string;
  options?: string[];
};

type KanbanColumn = { value?: string };

type PageElement = {
  type?: string;
  props?: Record<string, unknown>;
  children?: string[];
};

type BindingDefJson = {
  kind?: string;
  catalogKey?: string;
  attachChildren?: { catalogKey?: string };
};

type PageEntry = {
  key: string;
  spec: { root: string; elements: Record<string, PageElement> };
  bindings?: Record<string, BindingDefJson>;
  actions?: Record<string, unknown>;
};

const pagesTree = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../seed-packs/software-development-workflow/pages-tree.json",
    ),
    "utf8",
  ),
) as PageEntry[];

/** status property가 스키마 enum으로 고정된 catalogKey → 허용 값. */
const STATUS_ENUMS: Record<string, readonly string[]> = {
  pull_request: pullRequestStatusSchema.options,
  test_plan: testPlanStatusSchema.options,
  release: releaseStatusSchema.options,
  page_wireframe: pageWireframeStatusSchema.options,
  kpi: kpiStatusSchema.options,
  hypothesis: hypothesisStatusSchema.options,
  task: graphTaskStatusSchema.options,
  sprint: sprintStatusSchema.options,
  objective: goalHealthStatusSchema.options,
  key_result: goalHealthStatusSchema.options,
};

function bindingCatalogKey(
  page: PageEntry,
  bindingKey: unknown,
): string | undefined {
  if (typeof bindingKey !== "string") return undefined;
  return page.bindings?.[bindingKey]?.catalogKey;
}

/** 한 페이지에서 발견된 status 값 사용처 (usage 단위 검사·카운트용). */
type StatusUsage = {
  where: string;
  catalogKey: string;
  values: string[];
};

function collectStatusUsages(page: PageEntry): StatusUsage[] {
  const usages: StatusUsage[] = [];
  const push = (
    where: string,
    catalogKey: string | undefined,
    values: unknown[],
  ) => {
    if (!catalogKey || !(catalogKey in STATUS_ENUMS)) return;
    const strings = values.filter((v): v is string => typeof v === "string");
    if (strings.length === 0) return;
    usages.push({ where, catalogKey, values: strings });
  };

  for (const [elementId, el] of Object.entries(page.spec.elements)) {
    const props = el.props ?? {};
    const where = `${page.key} › ${elementId}`;

    if (el.type === "DataTable" || el.type === "NodeTable") {
      const catalogKey = bindingCatalogKey(page, props.binding);
      for (const col of (props.columns as Column[] | undefined) ?? []) {
        if (col.key === "status" && Array.isArray(col.options)) {
          push(`${where} (column status)`, catalogKey, col.options);
        }
      }
    }

    if (el.type === "ExpandableTable") {
      const parentKey = bindingCatalogKey(page, props.binding);
      for (const col of (props.columns as Column[] | undefined) ?? []) {
        if (col.key === "status" && Array.isArray(col.options)) {
          push(`${where} (parent column status)`, parentKey, col.options);
        }
      }
      const childKey =
        typeof props.binding === "string"
          ? page.bindings?.[props.binding]?.attachChildren?.catalogKey
          : undefined;
      for (const col of (props.childColumns as Column[] | undefined) ?? []) {
        if (col.key === "status" && Array.isArray(col.options)) {
          push(`${where} (child column status)`, childKey, col.options);
        }
      }
    }

    if (el.type === "KanbanBoard") {
      const groupField = (props.groupField as string | undefined) ?? "status";
      if (groupField === "status") {
        const catalogKey = bindingCatalogKey(page, props.binding);
        const values = ((props.columns as KanbanColumn[] | undefined) ?? []).map(
          (c) => c.value,
        );
        push(`${where} (kanban columns)`, catalogKey, values);
      }
    }

    if (el.type === "ApprovalInbox") {
      const statusField = (props.statusField as string | undefined) ?? "status";
      if (statusField === "status") {
        const catalogKey = bindingCatalogKey(page, props.binding);
        // 컴포넌트 기본값(approved/rejected)도 실제로 쓰이는 값이므로 함께 검사.
        const approveValue = (props.approveValue as string | undefined) ?? "approved";
        const rejectValue = (props.rejectValue as string | undefined) ?? "rejected";
        push(`${where} (approve/reject values)`, catalogKey, [
          approveValue,
          rejectValue,
        ]);
      }
    }
  }
  return usages;
}

describe("SWDL pages-tree — status options ⊆ schema enums (anti-drift)", () => {
  const allUsages = pagesTree.flatMap((page) => collectStatusUsages(page));

  it("finds enough status usages for the guard to be meaningful", () => {
    // 워커가 아무것도 못 찾으면(컴포넌트 rename 등) 가드가 조용히 무력화된다.
    expect(allUsages.length).toBeGreaterThanOrEqual(10);
  });

  it.each(allUsages.map((u) => [u.where, u] as const))(
    "%s stays within the schema enum",
    (_where, usage) => {
      const allowed = STATUS_ENUMS[usage.catalogKey];
      expect(allowed, usage.catalogKey).toBeDefined();
      if (!allowed) return;
      for (const value of usage.values) {
        expect(
          allowed,
          `'${value}' is not a legal ${usage.catalogKey} status (allowed: ${allowed.join(", ")})`,
        ).toContain(value);
      }
    },
  );

  it("pins the kpi status contract to active/archived (paused removed)", () => {
    // kpi 상태는 active/archived 뿐이다 — kpi 바인딩 select에 paused가
    // 재도입되면 위의 per-usage 검사가 잡는다.
    expect(kpiStatusSchema.options).toEqual(["active", "archived"]);
  });
});

describe("SWDL pages-tree — structural integrity", () => {
  it("every page record parses with pageRecordSchema", () => {
    for (const page of pagesTree) {
      const result = pageRecordSchema.safeParse(page);
      expect(
        result.success,
        `${page.key}: ${result.success ? "" : result.error.message}`,
      ).toBe(true);
    }
  });

  it("every element type is a known page component", () => {
    for (const page of pagesTree) {
      for (const [elementId, el] of Object.entries(page.spec.elements)) {
        expect(
          el.type && isKnownPageComponent(el.type),
          `${page.key} › ${elementId} uses unknown component '${el.type}'`,
        ).toBe(true);
      }
    }
  });

  // pageRecordSchema의 refine은 props.binding/props.action만 검사한다.
  // 컴포넌트별 binding/action prop(linked, candidates, setAction, …)과
  // Tabs panel/children 참조는 여기서 강제한다.
  const BINDING_PROPS = [
    "binding",
    "linked",
    "candidates",
    "nodes",
    "edges",
    "themeBinding",
    "selectedBinding",
    "optionsBinding",
    "compare",
  ] as const;
  const ACTION_PROPS = [
    "action",
    "setAction",
    "addAction",
    "deleteAction",
    "moveAction",
    "approveAction",
    "rejectAction",
    "emptyAction",
    "removeAction",
    "childSetAction",
    "childCellAction",
    "rowAction",
    "selectAction",
    "onEvent",
    "viewAction",
  ] as const;

  it("every referenced binding, action, panel, and child resolves", () => {
    const problems: string[] = [];
    for (const page of pagesTree) {
      const bindings = page.bindings ?? {};
      const actions = page.actions ?? {};
      const elements = page.spec.elements;
      if (!(page.spec.root in elements)) {
        problems.push(`${page.key}: root '${page.spec.root}' not in elements`);
      }
      for (const [elementId, el] of Object.entries(elements)) {
        const props = el.props ?? {};
        const where = `${page.key} › ${elementId}`;
        for (const prop of BINDING_PROPS) {
          const value = props[prop];
          if (typeof value === "string" && !(value in bindings)) {
            problems.push(`${where}: unknown binding ${prop}='${value}'`);
          }
        }
        for (const prop of ACTION_PROPS) {
          const value = props[prop];
          if (typeof value === "string" && !(value in actions)) {
            problems.push(`${where}: unknown action ${prop}='${value}'`);
          }
        }
        // Toolbar/RecordView 스타일: actions: [{ label, action }]
        if (Array.isArray(props.actions)) {
          for (const entry of props.actions as Array<{ action?: unknown }>) {
            if (
              entry &&
              typeof entry.action === "string" &&
              !(entry.action in actions)
            ) {
              problems.push(`${where}: unknown toolbar action '${entry.action}'`);
            }
          }
        }
        if (el.type === "Tabs") {
          for (const item of (props.items as Array<{ panel?: unknown }>) ?? []) {
            if (typeof item.panel === "string" && !(item.panel in elements)) {
              problems.push(`${where}: unknown tab panel '${item.panel}'`);
            }
          }
        }
        for (const child of el.children ?? []) {
          if (!(child in elements)) {
            problems.push(`${where}: unknown child '${child}'`);
          }
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
