import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagesTree = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../seed-packs/software-development-workflow/pages-tree.json",
    ),
    "utf8",
  ),
) as Array<{
  key: string;
  spec?: { elements?: Record<string, { type?: string; props?: Record<string, unknown> }> };
  bindings?: Record<string, { kind?: string; catalogKey?: string; limit?: number }>;
  actions?: Record<string, { kind?: string; catalogKey?: string }>;
}>;

describe("SWDL pages-tree delivery surfaces", () => {
  const byKey = new Map(pagesTree.map((p) => [p.key, p]));

  it("seeds global backlog, sprints board, and PR inbox", () => {
    for (const key of [
      "development/backlog",
      "development/sprints",
      "development/pull-requests",
      "development/api-snapshots",
    ]) {
      expect(byKey.has(key), key).toBe(true);
    }
    const backlogTypes = Object.values(byKey.get("development/backlog")!.spec!.elements!).map(
      (el) => el.type,
    );
    expect(backlogTypes).toContain("KanbanBoard");
    const sprintTypes = Object.values(byKey.get("development/sprints")!.spec!.elements!).map(
      (el) => el.type,
    );
    expect(sprintTypes).toContain("KanbanBoard");
  });

  it("uses hypothesis status board", () => {
    const types = Object.values(byKey.get("research/hypotheses")!.spec!.elements!).map(
      (el) => el.type,
    );
    expect(types).toContain("KanbanBoard");
  });

  it("seeds manager approvals inbox for teamspace-wide planning", () => {
    const page = byKey.get("manager/approvals");
    expect(page).toBeDefined();
    const types = Object.values(page!.spec!.elements!).map((el) => el.type);
    expect(types).toContain("ApprovalInbox");
    expect(types).toContain("Tabs");
  });

  it("seeds planning ApprovalInbox on PRD, features, and stories", () => {
    for (const key of [
      "tpl/initiative/planning/prd",
      "tpl/initiative/planning/features",
      "tpl/initiative/planning/stories",
    ]) {
      const types = Object.values(byKey.get(key)!.spec!.elements!).map((el) => el.type);
      expect(types, key).toContain("ApprovalInbox");
      expect(types, key).toContain("Tabs");
    }
  });

  it("seeds launch plan ApprovalInbox", () => {
    const types = Object.values(
      byKey.get("tpl/initiative/launch/plan")!.spec!.elements!,
    ).map((el) => el.type);
    expect(types).toContain("ApprovalInbox");
    expect(types).toContain("Tabs");
  });

  it("adds objective approval tab on executive/goals", () => {
    const page = byKey.get("executive/goals")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("Tabs");
    expect(types).toContain("ApprovalInbox");
    expect(page.bindings).toHaveProperty("pendingObjectives");
    expect(page.actions).toHaveProperty("setObjectiveStatus");
  });

  it("rebuilds research/user as interview table + docs tab with create action", () => {
    const page = byKey.get("research/user")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    for (const t of ["Tabs", "DataTable", "DocumentCardListSheet"]) {
      expect(types, t).toContain(t);
    }
    expect(page.actions?.createInterview).toMatchObject({
      kind: "create_node",
      catalogKey: "user_research",
    });
  });

  it("adds create affordances on research/market studies and competitors", () => {
    const page = byKey.get("research/market")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("Toolbar");
    expect(page.actions?.addStudy).toMatchObject({
      kind: "create_node",
      catalogKey: "market_research",
    });
    expect(page.actions?.addCompetitor).toMatchObject({
      kind: "create_node",
      catalogKey: "competitor",
    });
  });

  it("adds hypothesis list tab with create + evidence RelationEditor", () => {
    const page = byKey.get("research/hypotheses")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("DataTable");
    expect(types).toContain("RelationEditor");
    expect(page.actions?.addHypothesis).toMatchObject({
      kind: "create_node",
      catalogKey: "hypothesis",
    });
    expect(page.actions?.linkEvidence).toMatchObject({
      kind: "create_edge",
      catalogKey: "informs",
    });
    expect(page.bindings?.selectedHypothesis).toMatchObject({
      kind: "url_selection",
      catalogKey: "hypothesis",
    });
  });

  it("wires feature create + story estimate on initiative planning", () => {
    const features = byKey.get("tpl/initiative/planning/features")!;
    expect(features.actions?.addFeature).toMatchObject({
      kind: "create_node",
      catalogKey: "feature",
    });
    const stories = byKey.get("tpl/initiative/planning/stories")!;
    const storyColumns = Object.values(stories.spec!.elements!)
      .filter((el) => el.type === "DataTable")
      .flatMap((el) => (el.props?.columns as Array<{ key?: string }>) ?? []);
    expect(storyColumns.map((c) => c.key)).toContain("estimate");
  });

  it("restructures both PR inboxes as review inbox + full table + detail sheet", () => {
    for (const key of ["development/pull-requests", "tpl/initiative/build/pull-requests"]) {
      const page = byKey.get(key)!;
      const types = Object.values(page.spec!.elements!).map((el) => el.type);
      for (const t of ["Tabs", "ApprovalInbox", "NodeDetailSheet", "DataTable", "DocumentEditor"]) {
        expect(types, `${key} has ${t}`).toContain(t);
      }
      expect(page.bindings?.pendingReviews, key).toBeDefined();
      expect(page.bindings?.selectedPr, key).toMatchObject({
        kind: "url_selection",
        catalogKey: "pull_request",
      });
      expect(page.actions, key).toHaveProperty("setPrStatus");
    }
  });

  it("adds results + verifies RelationEditor on the QA test plan", () => {
    const page = byKey.get("tpl/initiative/qa/test-plan")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    for (const t of ["Tabs", "DocumentEditor", "TestResults", "DataTable", "RelationEditor"]) {
      expect(types, t).toContain(t);
    }
    expect(page.bindings?.verifiedTargets).toMatchObject({
      kind: "traverse",
      edgeCatalogKey: "verifies",
    });
    expect(page.actions?.linkVerifies).toMatchObject({
      kind: "create_edge",
      catalogKey: "verifies",
    });
  });

  it("adds release note / runbook create actions on launch docs", () => {
    const page = byKey.get("tpl/initiative/launch/docs")!;
    expect(page.actions?.addReleaseNote).toMatchObject({
      kind: "create_node",
      catalogKey: "release_note",
    });
    expect(page.actions?.addRunbook).toMatchObject({
      kind: "create_node",
      catalogKey: "runbook",
    });
  });

  it("adds snapshot create + trend chart on retrospective metrics", () => {
    const page = byKey.get("tpl/initiative/retrospective/metrics")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("ChartLine");
    expect(page.actions?.addSnapshot).toMatchObject({
      kind: "create_node",
      catalogKey: "metric_snapshot",
    });
  });

  it("adds retrospective create action on retrospective review", () => {
    const page = byKey.get("tpl/initiative/retrospective/review")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("Button");
    expect(page.actions?.createRetro).toMatchObject({
      kind: "create_node",
      catalogKey: "retrospective",
    });
  });

  it("adds crit cycle + component RelationEditor on design wireframes", () => {
    const page = byKey.get("tpl/initiative/design/wireframes")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    for (const t of ["WireframeCanvas", "DataTable", "ApprovalInbox", "RelationEditor"]) {
      expect(types, t).toContain(t);
    }
    expect(page.bindings?.pendingCrit).toBeDefined();
    expect(page.actions?.addWireframe).toMatchObject({
      kind: "create_node",
      catalogKey: "page_wireframe",
    });
    expect(page.actions?.linkComponent).toMatchObject({
      kind: "create_edge",
      catalogKey: "references",
    });
  });

  it("lifts the single-flow limit on design flows and adds create + doc list", () => {
    const page = byKey.get("tpl/initiative/design/flows")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    for (const t of ["Toolbar", "FlowCanvas", "DocumentCardListSheet"]) {
      expect(types, t).toContain(t);
    }
    expect(page.bindings?.flows).toMatchObject({
      kind: "initiative_scope",
      catalogKey: "user_flow",
    });
    expect(page.bindings?.flows?.limit).toBeUndefined();
    expect(page.actions?.addFlow).toMatchObject({
      kind: "create_node",
      catalogKey: "user_flow",
    });
  });

  it("adds snapshot-vs-reference SchemaDisplay compare on api-snapshots", () => {
    const page = byKey.get("development/api-snapshots")!;
    const schemaDisplay = Object.values(page.spec!.elements!).find(
      (el) => el.type === "SchemaDisplay",
    );
    expect(schemaDisplay).toBeDefined();
    expect(schemaDisplay!.props).toMatchObject({
      binding: "selectedSnapshot",
      compare: "reference",
    });
    expect(page.bindings?.reference).toMatchObject({
      kind: "evergreen",
      catalogKey: "api_reference",
    });
  });

  it("adds sprint task assignment RelationEditor on development/sprints", () => {
    const page = byKey.get("development/sprints")!;
    const types = Object.values(page.spec!.elements!).map((el) => el.type);
    expect(types).toContain("RelationEditor");
    expect(page.bindings?.sprintTasks).toMatchObject({
      kind: "traverse",
      edgeCatalogKey: "part_of",
    });
    expect(page.actions?.assignTask).toMatchObject({
      kind: "create_edge",
      catalogKey: "part_of",
    });
  });

  it("seeds StatRow on L0 and initiative section hubs", () => {
    for (const key of [
      "executive",
      "research",
      "manager",
      "development",
      "design",
      "tpl/initiative/planning",
      "tpl/initiative/design",
      "tpl/initiative/architecture",
      "tpl/initiative/build",
      "tpl/initiative/qa",
      "tpl/initiative/launch",
      "tpl/initiative/retrospective",
    ]) {
      const types = Object.values(byKey.get(key)!.spec!.elements!).map((el) => el.type);
      expect(types, key).toContain("StatRow");
    }
  });
});
