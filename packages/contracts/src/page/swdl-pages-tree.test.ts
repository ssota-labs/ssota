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
) as Array<{ key: string; spec?: { elements?: Record<string, { type?: string }> } }>;

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

  it("seeds planning ApprovalInbox on PRD and features", () => {
    for (const key of ["tpl/initiative/planning/prd", "tpl/initiative/planning/features"]) {
      const types = Object.values(byKey.get(key)!.spec!.elements!).map((el) => el.type);
      expect(types, key).toContain("ApprovalInbox");
      expect(types, key).toContain("Tabs");
    }
  });
});
