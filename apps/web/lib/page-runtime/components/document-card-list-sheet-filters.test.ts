import { describe, expect, it } from "vitest";
import type { RenderNode } from "../types";
import {
  applyDocumentCardListSheetFilters,
  buildInitialFilterState,
} from "./document-card-list-sheet-filters";

const node = (
  id: string,
  properties: Record<string, unknown>,
  title = id,
): RenderNode => ({
  id,
  title,
  catalogKey: "roadmap",
  properties,
});

describe("document card list sheet filters", () => {
  it("hides archived product roadmaps until the toggle is enabled", () => {
    const nodes = [
      node("active", { doc_status: "active", summary: "Current" }, "Product roadmap"),
      node(
        "archived",
        { doc_status: "archived", summary: "Old" },
        "Product roadmap (2025 archive)",
      ),
    ];
    const filters = [
      {
        type: "toggle" as const,
        field: "doc_status",
        value: "archived",
        label: "Show archived",
        defaultHidden: true,
      },
    ];
    const state = buildInitialFilterState(filters, nodes, 2026);

    expect(
      applyDocumentCardListSheetFilters(nodes, filters, state).map((row) => row.id),
    ).toEqual(["active"]);

    const showingArchived = { ...state, "toggle:doc_status:archived:0": true };
    expect(
      applyDocumentCardListSheetFilters(nodes, filters, showingArchived).map(
        (row) => row.id,
      ),
    ).toEqual(["active", "archived"]);
  });

  it("filters planning roadmaps by selected year", () => {
    const nodes = [
      node(
        "2026-annual",
        { doc_status: "active", year: 2026, kind: "annual" },
        "2026 연간 로드맵",
      ),
      node(
        "2025-annual",
        { doc_status: "archived", year: 2025, kind: "annual" },
        "2025 연간 로드맵",
      ),
    ];
    const filters = [
      {
        type: "select" as const,
        field: "year",
        label: "Year",
      },
    ];
    const state = buildInitialFilterState(filters, nodes, 2026);

    expect(
      applyDocumentCardListSheetFilters(nodes, filters, state).map((row) => row.id),
    ).toEqual(["2026-annual"]);

    const year2025 = { ...state, "select:year:0": 2025 };
    expect(
      applyDocumentCardListSheetFilters(nodes, filters, year2025).map((row) => row.id),
    ).toEqual(["2025-annual"]);
  });
});
