import { describe, it, expect } from "vitest";
import {
  activeFunctionAt,
  coerceGrid,
  colToLetters,
  computeDisplay,
  fromA1,
  reorderGrid,
  toA1,
  type SheetGrid,
} from "./sheet-grid";

describe("A1 helpers", () => {
  it("round-trips columns and addresses", () => {
    expect(colToLetters(0)).toBe("A");
    expect(colToLetters(25)).toBe("Z");
    expect(colToLetters(26)).toBe("AA");
    expect(toA1(0, 0)).toBe("A1");
    expect(toA1(2, 26)).toBe("AA3");
    expect(fromA1("AA3")).toEqual({ row: 2, col: 26 });
    expect(fromA1("nope")).toBeNull();
  });
});

describe("computeDisplay (formula engine)", () => {
  it("evaluates refs, ranges, arithmetic, and functions", () => {
    const g = coerceGrid({
      rowCount: 6,
      colCount: 5,
      cells: {
        B2: { value: 1200 },
        B3: { value: 4200 },
        B4: { value: 800 },
        B6: { value: "=SUM(B2:B4)" },
        C1: { value: "=B6/2" },
        E1: { value: "=MAX(B2,B3,B4)" },
        D1: { value: "=AVERAGE(B2:B4)" },
        A1: { value: "Item" },
      },
    });
    const d = computeDisplay(g);
    expect(d.B6).toBe("6200");
    expect(d.C1).toBe("3100");
    expect(d.E1).toBe("4200");
    expect(d.D1).toBe(String(Math.round((6200 / 3) * 1e6) / 1e6));
    expect(d.A1).toBe("Item");
  });
  it("detects reference cycles", () => {
    const g = coerceGrid({
      rowCount: 2,
      colCount: 2,
      cells: { A1: { value: "=B1" }, B1: { value: "=A1" } },
    });
    expect(computeDisplay(g).A1).toBe("#CYCLE!");
  });
});

describe("activeFunctionAt", () => {
  it("returns null outside a function call", () => {
    expect(activeFunctionAt("=")).toBeNull();
    expect(activeFunctionAt("=A1+B2")).toBeNull();
    expect(activeFunctionAt("=MIN(A1:A5)")).toBeNull(); // closed
  });
  it("reports the innermost open function and arg index", () => {
    expect(activeFunctionAt("=MIN(")).toEqual({ name: "MIN", argIndex: 0 });
    expect(activeFunctionAt("=MIN(A1,")).toEqual({ name: "MIN", argIndex: 1 });
    expect(activeFunctionAt("=SUM(MIN(")).toEqual({ name: "MIN", argIndex: 0 });
    expect(activeFunctionAt("=SUM(MIN(A1:A2),")).toEqual({
      name: "SUM",
      argIndex: 1,
    });
    expect(activeFunctionAt("=min(")).toEqual({ name: "MIN", argIndex: 0 });
  });
});

describe("reorderGrid", () => {
  const grid: SheetGrid = {
    rowCount: 3,
    colCount: 3,
    colWidths: [100, 200, 300],
    cells: {
      A1: { value: "a1" },
      B1: { value: "b1" },
      C1: { value: "c1" },
      A2: { value: "a2" },
      B2: { value: "b2" },
      C2: { value: "c2" },
    },
  };

  it("moves column A to the end (dropAt=3)", () => {
    const g = reorderGrid(grid, "col", 0, 3); // order becomes [1,2,0]
    expect(g.cells.C1?.value).toBe("a1");
    expect(g.cells.A1?.value).toBe("b1");
    expect(g.cells.B1?.value).toBe("c1");
    expect(g.colWidths).toEqual([200, 300, 100]);
  });
  it("moves column C before column A (dropAt=0)", () => {
    const g = reorderGrid(grid, "col", 2, 0); // order [2,0,1]
    expect(g.cells.A1?.value).toBe("c1");
    expect(g.cells.B1?.value).toBe("a1");
    expect(g.cells.C1?.value).toBe("b1");
    expect(g.colWidths).toEqual([300, 100, 200]);
  });
  it("moves row 0 below row 1 (dropAt=2)", () => {
    const g = reorderGrid(grid, "row", 0, 2); // rows order [1,0,2]
    expect(g.cells.A2?.value).toBe("a1");
    expect(g.cells.A1?.value).toBe("a2");
  });
  it("returns the same grid for a no-op move", () => {
    expect(reorderGrid(grid, "col", 1, 1)).toBe(grid);
    expect(reorderGrid(grid, "col", 1, 2)).toBe(grid);
  });
});
