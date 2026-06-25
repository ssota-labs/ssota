"use client";

import * as React from "react";
import { PlusIcon } from "@phosphor-icons/react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";
import { cn } from "@ssota/ui/lib/utils";
import { useAction } from "../context";
import { boundNode } from "../bindings";
import {
  activeFunctionAt,
  coerceGrid,
  colToLetters,
  computeDisplay,
  DEFAULT_COL_WIDTH,
  fromA1,
  MIN_COL_WIDTH,
  reorderGrid,
  toA1,
  type SheetCellValue,
  type SheetGrid,
} from "../sheet-grid";
import type { CatalogComponent, RenderNode } from "../types";

type Pos = { row: number; col: number };

const GUTTER_WIDTH = 40;
const ADDCOL_WIDTH = 32;

/** Built-in formula functions surfaced as `=` autocomplete + signature hints. */
const FORMULA_FUNCTIONS = [
  { name: "SUM", sig: "SUM(범위)", desc: "합계", help: "숫자나 범위의 합. 예: SUM(A1:A10)" },
  { name: "AVERAGE", sig: "AVERAGE(범위)", desc: "평균", help: "산술 평균. 예: AVERAGE(B2:B8)" },
  { name: "MIN", sig: "MIN(범위)", desc: "최솟값", help: "가장 작은 값. 예: MIN(A1:A5)" },
  { name: "MAX", sig: "MAX(범위)", desc: "최댓값", help: "가장 큰 값. 예: MAX(A1:A5)" },
  { name: "COUNT", sig: "COUNT(범위)", desc: "개수", help: "숫자 인수의 개수. 예: COUNT(A1:A20)" },
];

/** Variadic argument tokens shown in the signature popover (current arg bolded). */
const FORMULA_ARGS = ["값1", "값2", "…"];

/** Debounce a value-emitting callback (trailing edge). */
function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  return React.useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

/** Parse a raw input string into a stored cell value (number / formula / text). */
function parseInput(raw: string): SheetCellValue {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.startsWith("=")) return trimmed;
  const n = Number(trimmed);
  return !Number.isNaN(n) && trimmed !== "" ? n : raw;
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function SpreadsheetEl({
  node,
  property,
  title,
  setAction,
}: {
  node: RenderNode | undefined;
  property: string;
  title?: string;
  setAction?: string;
}) {
  const onAction = useAction();

  const initial = React.useMemo<SheetGrid>(
    () => coerceGrid(node?.properties?.[property]),
    [node?.properties, property],
  );

  const [grid, setGrid] = React.useState<SheetGrid>(initial);
  const [colWidths, setColWidths] = React.useState<number[]>(
    initial.colWidths ?? [],
  );
  const signature = JSON.stringify(initial);
  React.useEffect(() => {
    setGrid(initial);
    setColWidths(initial.colWidths ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const [sel, setSel] = React.useState<Pos>({ row: 0, col: 0 });
  const [anchor, setAnchor] = React.useState<Pos>({ row: 0, col: 0 });
  const [editing, setEditing] = React.useState<Pos | null>(null);
  const [draft, setDraft] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  // Point mode: while editing a formula at a reference position, arrow keys pick
  // a cell/range and insert its A1 reference (Shift+arrow extends the range).
  const [refMode, setRefMode] = React.useState<{
    base: string;
    anchor: Pos;
    focus: Pos;
  } | null>(null);
  const refModeRef = React.useRef(refMode);
  refModeRef.current = refMode;

  const display = React.useMemo(() => computeDisplay(grid), [grid]);

  const widthOf = React.useCallback(
    (c: number) => colWidths[c] ?? DEFAULT_COL_WIDTH,
    [colWidths],
  );
  const totalWidth =
    GUTTER_WIDTH +
    Array.from({ length: grid.colCount }, (_, c) => widthOf(c)).reduce(
      (a, b) => a + b,
      0,
    ) +
    ADDCOL_WIDTH;

  const save = useDebouncedCallback((next: SheetGrid) => {
    if (onAction && setAction && node)
      void onAction(setAction, {
        nodeId: node.id,
        field: property,
        value: next,
      });
  }, 600);

  // --- Column resize: global listeners while a handle is held ---
  const [resizing, setResizing] = React.useState<{
    col: number;
    startX: number;
    startW: number;
  } | null>(null);
  const colWidthsRef = React.useRef(colWidths);
  colWidthsRef.current = colWidths;
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const w = Math.max(MIN_COL_WIDTH, resizing.startW + (e.clientX - resizing.startX));
      setColWidths((prev) => {
        const next = [...prev];
        while (next.length <= resizing.col) next.push(DEFAULT_COL_WIDTH);
        next[resizing.col] = w;
        return next;
      });
    };
    const onUp = () => {
      setResizing(null);
      setGrid((prev) => {
        const next = { ...prev, colWidths: colWidthsRef.current };
        save(next);
        return next;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, save]);

  // --- Drag-to-select: clear the dragging flag on any mouseup ---
  React.useEffect(() => {
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // --- Row/column move (drag a header) + snapping drop indicator ---
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [dragLine, setDragLine] = React.useState<{
    axis: "col" | "row";
    px: number;
  } | null>(null);

  // Remap every cell (and colWidths for columns) when a line is reordered.
  const reorderLine = React.useCallback(
    (axis: "col" | "row", from: number, dropAt: number) => {
      setGrid((prev) => {
        const next = reorderGrid(prev, axis, from, dropAt);
        if (next === prev) return prev; // no-op
        if (axis === "col" && next.colWidths) setColWidths(next.colWidths);
        save(next);
        return next;
      });
    },
    [save],
  );

  // Click a header (no drag) → select the whole row/column.
  const selectWholeLine = React.useCallback(
    (axis: "col" | "row", index: number) => {
      setEditing(null);
      if (axis === "col") {
        setAnchor({ row: 0, col: index });
        setSel({ row: grid.rowCount - 1, col: index });
      } else {
        setAnchor({ row: index, col: 0 });
        setSel({ row: index, col: grid.colCount - 1 });
      }
      containerRef.current?.focus();
    },
    [grid.rowCount, grid.colCount],
  );

  // Header mousedown: a drag past a small threshold reorders (snapping the drop
  // indicator to the nearest boundary); a plain click selects the whole line.
  const startHeaderDrag = React.useCallback(
    (axis: "col" | "row", index: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let dropAt = index;
      const onMove = (ev: MouseEvent) => {
        if (
          !dragging &&
          Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4
        )
          return;
        dragging = true;
        const table = tableRef.current;
        if (!table) return;
        const rect = table.getBoundingClientRect();
        const sel = axis === "col" ? "thead th[data-col]" : "tbody tr[data-row]";
        const els = [...table.querySelectorAll<HTMLElement>(sel)];
        const bounds = els.map((el) => {
          const r = el.getBoundingClientRect();
          return axis === "col" ? r.left - rect.left : r.top - rect.top;
        });
        const last = els[els.length - 1];
        if (last) {
          const r = last.getBoundingClientRect();
          bounds.push(axis === "col" ? r.right - rect.left : r.bottom - rect.top);
        }
        const pointer = axis === "col" ? ev.clientX - rect.left : ev.clientY - rect.top;
        let best = 0;
        let bestD = Infinity;
        bounds.forEach((b, k) => {
          const d = Math.abs(pointer - b);
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        });
        dropAt = best;
        setDragLine({ axis, px: bounds[best] ?? 0 });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setDragLine(null);
        if (dragging) reorderLine(axis, index, dropAt);
        else selectWholeLine(axis, index);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [reorderLine, selectWholeLine],
  );

  const writeCell = React.useCallback(
    (row: number, col: number, raw: string) => {
      setGrid((prev) => {
        const addr = toA1(row, col);
        const value = parseInput(raw);
        const cells = { ...prev.cells };
        if (value == null) delete cells[addr];
        else cells[addr] = { value };
        const next = { ...prev, cells };
        save(next);
        return next;
      });
    },
    [save],
  );

  const clearRange = React.useCallback(
    (a: Pos, b: Pos) => {
      setGrid((prev) => {
        const cells = { ...prev.cells };
        for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
          for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
            delete cells[toA1(r, c)];
        const next = { ...prev, cells };
        save(next);
        return next;
      });
    },
    [save],
  );

  const rawAt = React.useCallback(
    (row: number, col: number): string => {
      const v = grid.cells[toA1(row, col)]?.value;
      return v == null ? "" : String(v);
    },
    [grid.cells],
  );

  const inRange = React.useCallback(
    (row: number, col: number): boolean =>
      row >= Math.min(anchor.row, sel.row) &&
      row <= Math.max(anchor.row, sel.row) &&
      col >= Math.min(anchor.col, sel.col) &&
      col <= Math.max(anchor.col, sel.col),
    [anchor, sel],
  );

  const commitDraft = React.useCallback(() => {
    if (editing) writeCell(editing.row, editing.col, draft);
    setEditing(null);
    setRefMode(null);
  }, [editing, draft, writeCell]);

  const startEditing = React.useCallback(
    (pos: Pos, seed?: string) => {
      setEditing(pos);
      setDraft(seed ?? rawAt(pos.row, pos.col));
      setRefMode(null);
    },
    [rawAt],
  );

  // A1 text for a range (single cell when anchor === focus).
  const rangeA1 = (a: Pos, b: Pos) => {
    const r0 = Math.min(a.row, b.row);
    const r1 = Math.max(a.row, b.row);
    const c0 = Math.min(a.col, b.col);
    const c1 = Math.max(a.col, b.col);
    return r0 === r1 && c0 === c1
      ? toA1(r0, c0)
      : `${toA1(r0, c0)}:${toA1(r1, c1)}`;
  };

  // A reference (A2 or A2:B3) at the very end of `text`, preceded by a reference
  // boundary — so an existing ref can be re-extended with Shift+arrow.
  const trailingRef = (
    text: string,
  ): { base: string; anchor: Pos; focus: Pos } | null => {
    const m = /([A-Za-z]+\d+)(?::([A-Za-z]+\d+))?$/.exec(text);
    if (!m) return null;
    const before = m.index === 0 ? "" : text.charAt(m.index - 1);
    if (m.index !== 0 && !"=(,:+-*/ ".includes(before)) return null;
    const a = fromA1(m[1]!.toUpperCase());
    const b = m[2] ? fromA1(m[2].toUpperCase()) : a;
    if (!a || !b) return null;
    return { base: text.slice(0, m.index), anchor: a, focus: b };
  };

  // Point mode: move the reference cursor and rewrite the trailing reference in
  // the draft. Highlights reuse sel/anchor so the picked range lights up.
  const pointArrow = React.useCallback(
    (dr: number, dc: number, shift: boolean) => {
      if (!editing) return;
      const clampR = (v: number) => Math.min(Math.max(v, 0), grid.rowCount - 1);
      const clampC = (v: number) => Math.min(Math.max(v, 0), grid.colCount - 1);
      const prev = refModeRef.current;
      let base: string;
      let focusP: Pos;
      let anchorP: Pos;
      if (prev) {
        base = prev.base;
        focusP = {
          row: clampR(prev.focus.row + dr),
          col: clampC(prev.focus.col + dc),
        };
        anchorP = shift ? prev.anchor : focusP;
      } else {
        const seed = trailingRef(draft);
        if (seed) {
          // Re-extend an existing reference (e.g. a typed `=SUM(A2`).
          base = seed.base;
          focusP = {
            row: clampR(seed.focus.row + dr),
            col: clampC(seed.focus.col + dc),
          };
          anchorP = shift ? seed.anchor : focusP;
        } else {
          // Fresh pick: start at the editing cell's neighbor.
          base = draft;
          const start = {
            row: clampR(editing.row + dr),
            col: clampC(editing.col + dc),
          };
          focusP = start;
          anchorP = start;
        }
      }
      setRefMode({ base, anchor: anchorP, focus: focusP });
      setDraft(base + rangeA1(anchorP, focusP));
      setAnchor(anchorP);
      setSel(focusP);
    },
    [editing, draft, grid.rowCount, grid.colCount],
  );

  const move = React.useCallback(
    (dr: number, dc: number, extend: boolean) => {
      setSel((prev) => {
        const row = Math.min(Math.max(prev.row + dr, 0), grid.rowCount - 1);
        const col = Math.min(Math.max(prev.col + dc, 0), grid.colCount - 1);
        const next = { row, col };
        if (!extend) setAnchor(next);
        return next;
      });
    },
    [grid.rowCount, grid.colCount],
  );

  const copyRange = React.useCallback(() => {
    const r0 = Math.min(anchor.row, sel.row);
    const r1 = Math.max(anchor.row, sel.row);
    const c0 = Math.min(anchor.col, sel.col);
    const c1 = Math.max(anchor.col, sel.col);
    const lines: string[] = [];
    for (let r = r0; r <= r1; r++) {
      const cols: string[] = [];
      for (let c = c0; c <= c1; c++)
        cols.push(csvEscape(display[toA1(r, c)] ?? ""));
      lines.push(cols.join(","));
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
  }, [anchor, sel, display]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (editing) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitDraft();
          move(1, 0, false);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditing(null);
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitDraft();
          move(0, e.shiftKey ? -1 : 1, false);
        }
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyRange();
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          move(-1, 0, e.shiftKey);
          break;
        case "ArrowDown":
          e.preventDefault();
          move(1, 0, e.shiftKey);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move(0, -1, e.shiftKey);
          break;
        case "ArrowRight":
        case "Tab":
          e.preventDefault();
          move(0, e.shiftKey && e.key === "Tab" ? -1 : 1, false);
          break;
        case "Enter":
          e.preventDefault();
          startEditing(sel);
          break;
        case "Backspace":
        case "Delete":
          e.preventDefault();
          clearRange(anchor, sel);
          break;
        case "Home":
          e.preventDefault();
          move(0, -grid.colCount, e.shiftKey);
          break;
        case "End":
          e.preventDefault();
          move(0, grid.colCount, e.shiftKey);
          break;
        default:
          // Begin editing on a printable character.
          if (e.key.length === 1 && !meta && !e.altKey) {
            e.preventDefault();
            startEditing(sel, e.key);
          }
      }
    },
    [
      editing,
      commitDraft,
      move,
      copyRange,
      startEditing,
      sel,
      anchor,
      clearRange,
      grid.colCount,
    ],
  );

  const addRow = () =>
    setGrid((prev) => {
      const next = { ...prev, rowCount: prev.rowCount + 1 };
      save(next);
      return next;
    });
  const addCol = () =>
    setGrid((prev) => {
      const next = { ...prev, colCount: prev.colCount + 1 };
      save(next);
      return next;
    });

  // Formula autocomplete: when the draft begins with "=", suggest functions.
  // Show on a bare "=" or while a trailing identifier is being typed; hide once
  // an "(" / digit / operator follows (so it doesn't re-open after a pick).
  const [hintIndex, setHintIndex] = React.useState(0);
  const formulaHints = React.useMemo(() => {
    if (!editing || !draft.startsWith("=")) return [];
    if (draft !== "=" && !/[A-Za-z]+$/.test(draft)) return [];
    const frag = (/([A-Za-z]+)$/.exec(draft)?.[1] ?? "").toUpperCase();
    return FORMULA_FUNCTIONS.filter((f) => f.name.startsWith(frag));
  }, [editing, draft]);

  // Reset the highlighted hint whenever the draft changes (typing re-filters);
  // arrow-key navigation moves it without touching the draft.
  React.useEffect(() => {
    setHintIndex(0);
  }, [draft]);

  // Signature help: when the cursor sits inside a function's parentheses (and the
  // function-list popover isn't showing), surface that function's argument hint —
  // like Google Sheets' "MIN(value1, [value2, …])" tooltip.
  const signatureHint = React.useMemo(() => {
    if (!editing || !draft.startsWith("=") || formulaHints.length > 0) return null;
    const active = activeFunctionAt(draft);
    if (!active) return null;
    const fn = FORMULA_FUNCTIONS.find((f) => f.name === active.name);
    return fn ? { fn, argIndex: active.argIndex } : null;
  }, [editing, draft, formulaHints]);

  const insertFunction = React.useCallback((name: string) => {
    setDraft((prev) =>
      (/([A-Za-z]+)$/.test(prev) ? prev.replace(/([A-Za-z]+)$/, "") : prev) +
      name +
      "(",
    );
  }, []);

  const selAddr = toA1(sel.row, sel.col);
  // Header highlight bounds: a row/column header is "active" when the selection
  // range intersects it (like Sheets' lit-up row/column headers).
  const minC = Math.min(anchor.col, sel.col);
  const maxC = Math.max(anchor.col, sel.col);
  const minR = Math.min(anchor.row, sel.row);
  const maxR = Math.max(anchor.row, sel.row);

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}

      {/* Formula bar */}
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 rounded border bg-muted/40 px-2 py-1 text-center text-xs font-medium text-muted-foreground">
          {selAddr}
        </span>
        <input
          className="h-7 flex-1 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          value={
            editing && editing.row === sel.row && editing.col === sel.col
              ? draft
              : rawAt(sel.row, sel.col)
          }
          onChange={(e) => {
            if (!editing) startEditing(sel, e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitDraft();
              containerRef.current?.focus();
            } else if (e.key === "Escape") {
              setEditing(null);
              containerRef.current?.focus();
            }
          }}
          placeholder="값 또는 =SUM(A1:A3)"
        />
      </div>

      {/* Single scroll container (both axes): a raw <table> avoids the shadcn
          Table wrapper's nested overflow div, so the sticky header/gutter and
          horizontal scroll share one viewport. */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="max-h-[480px] select-none overflow-auto rounded-md border outline-none focus:ring-1 focus:ring-primary"
      >
        <div className="relative" style={{ width: totalWidth }}>
        <table
          ref={tableRef}
          className="cn-table border-separate border-spacing-0"
          style={{ width: totalWidth, tableLayout: "fixed" }}
        >
          <TableHeader className="sticky top-0 z-20 bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="sticky left-0 z-30 border-b border-r bg-muted text-center"
                style={{ width: GUTTER_WIDTH }}
              />
              {Array.from({ length: grid.colCount }, (_, c) => (
                <TableHead
                  key={c}
                  data-col={c}
                  onMouseDown={(e) => startHeaderDrag("col", c, e)}
                  className={cn(
                    "relative cursor-grab border-b border-r bg-muted text-center font-medium select-none active:cursor-grabbing",
                    c >= minC && c <= maxC
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground",
                  )}
                  style={{ width: widthOf(c) }}
                >
                  {colToLetters(c)}
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizing({ col: c, startX: e.clientX, startW: widthOf(c) });
                    }}
                    className={cn(
                      "absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/40",
                      resizing?.col === c && "bg-primary",
                    )}
                    aria-hidden
                  />
                </TableHead>
              ))}
              {/* Add-column button */}
              <TableHead
                className="border-b bg-muted p-0 text-center"
                style={{ width: ADDCOL_WIDTH }}
              >
                <button
                  type="button"
                  onClick={addCol}
                  aria-label="열 추가"
                  className="flex size-full items-center justify-center text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: grid.rowCount }, (_, r) => (
              <TableRow key={r} data-row={r} className="hover:bg-transparent">
                <TableHead
                  onMouseDown={(e) => startHeaderDrag("row", r, e)}
                  className={cn(
                    "sticky left-0 z-10 cursor-grab border-b border-r bg-muted text-center text-xs font-medium select-none active:cursor-grabbing",
                    r >= minR && r <= maxR
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground",
                  )}
                  style={{ width: GUTTER_WIDTH }}
                >
                  {r + 1}
                </TableHead>
                {Array.from({ length: grid.colCount }, (_, c) => {
                  const isSel = sel.row === r && sel.col === c;
                  const isEditing =
                    editing && editing.row === r && editing.col === c;
                  const selected = inRange(r, c);
                  return (
                    <TableCell
                      key={c}
                      onMouseDown={(e) => {
                        if (isEditing) return;
                        const pos = { row: r, col: c };
                        setSel(pos);
                        if (!e.shiftKey) setAnchor(pos);
                        draggingRef.current = true;
                        containerRef.current?.focus();
                      }}
                      onMouseEnter={() => {
                        if (draggingRef.current) setSel({ row: r, col: c });
                      }}
                      onDoubleClick={() => startEditing({ row: r, col: c })}
                      className={cn(
                        "relative h-7 cursor-cell border-b border-r text-xs",
                        selected && !isSel && "bg-primary/10",
                        isSel && !isEditing && "ring-1 ring-inset ring-primary",
                      )}
                      style={{ width: widthOf(c), padding: 0 }}
                    >
                      {isEditing ? (
                        <>
                          <input
                            autoFocus
                            className="absolute inset-0 z-20 size-full select-text bg-background px-2 text-xs outline-none ring-1 ring-inset ring-primary"
                            value={draft}
                            onChange={(e) => {
                              setRefMode(null);
                              setDraft(e.target.value);
                            }}
                            onBlur={commitDraft}
                            onKeyDown={(e) => {
                              const hintsOpen = formulaHints.length > 0;
                              // Arrow-navigate the formula hint list.
                              if (
                                hintsOpen &&
                                (e.key === "ArrowDown" || e.key === "ArrowUp")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                setHintIndex((i) =>
                                  e.key === "ArrowDown"
                                    ? Math.min(i + 1, formulaHints.length - 1)
                                    : Math.max(i - 1, 0),
                                );
                                return;
                              }
                              // Enter/Tab accept the highlighted hint instead of
                              // committing the cell.
                              if (
                                hintsOpen &&
                                (e.key === "Enter" || e.key === "Tab")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                const pick =
                                  formulaHints[hintIndex] ?? formulaHints[0];
                                if (pick) insertFunction(pick.name);
                                return;
                              }
                              // Point mode: in a formula, at a reference position
                              // (after = ( , or an operator), arrows pick a cell;
                              // Shift+arrow extends the inserted range reference.
                              const isArrow =
                                e.key === "ArrowUp" ||
                                e.key === "ArrowDown" ||
                                e.key === "ArrowLeft" ||
                                e.key === "ArrowRight";
                              const formula = draft.startsWith("=");
                              const lastChar = draft.trimEnd().slice(-1);
                              const refPos =
                                formula && "=(,:+-*/".includes(lastChar);
                              // Shift+arrow in a formula always picks a range
                              // (never selects input text) when there's a
                              // reference to start or extend.
                              const shiftExtend =
                                e.shiftKey && formula && !!trailingRef(draft);
                              if (
                                isArrow &&
                                (refModeRef.current || refPos || shiftExtend)
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                pointArrow(
                                  e.key === "ArrowUp"
                                    ? -1
                                    : e.key === "ArrowDown"
                                      ? 1
                                      : 0,
                                  e.key === "ArrowLeft"
                                    ? -1
                                    : e.key === "ArrowRight"
                                      ? 1
                                      : 0,
                                  e.shiftKey,
                                );
                                return;
                              }
                              // Any non-arrow key commits the picked reference.
                              if (refModeRef.current && !isArrow) setRefMode(null);
                              // Let the container handler manage Enter/Tab/Escape.
                              if (
                                e.key !== "Enter" &&
                                e.key !== "Tab" &&
                                e.key !== "Escape"
                              )
                                e.stopPropagation();
                            }}
                          />
                          {formulaHints.length > 0 ? (
                            <div className="absolute top-full left-0 z-30 mt-0.5 min-w-[200px] rounded-md border bg-popover p-1 text-left shadow-md">
                              {formulaHints.map((h, i) => (
                                <button
                                  key={h.name}
                                  type="button"
                                  // mousedown + preventDefault keeps the input
                                  // focused (no blur-commit before the insert).
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    insertFunction(h.name);
                                  }}
                                  onMouseEnter={() => setHintIndex(i)}
                                  aria-selected={i === hintIndex}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-3 rounded px-2 py-1 hover:bg-muted",
                                    i === hintIndex && "bg-muted",
                                  )}
                                >
                                  <span className="font-mono text-xs font-medium">
                                    {h.sig}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {h.desc}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : signatureHint ? (
                            <div className="absolute top-full left-0 z-30 mt-0.5 w-max max-w-[260px] rounded-md border bg-popover p-2 text-left shadow-md">
                              <div className="font-mono text-xs">
                                <span className="font-semibold">
                                  {signatureHint.fn.name}
                                </span>
                                (
                                {FORMULA_ARGS.map((arg, i) => (
                                  <span key={arg}>
                                    {i > 0 ? ", " : ""}
                                    <span
                                      className={cn(
                                        Math.min(
                                          signatureHint.argIndex,
                                          FORMULA_ARGS.length - 1,
                                        ) === i
                                          ? "font-semibold text-foreground"
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {arg}
                                    </span>
                                  </span>
                                ))}
                                )
                              </div>
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {signatureHint.fn.help}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="block truncate px-2">
                          {display[toA1(r, c)] ?? ""}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="border-b" style={{ width: ADDCOL_WIDTH }} />
              </TableRow>
            ))}
            {/* Add-row button */}
            <TableRow className="hover:bg-transparent">
              <TableCell className="p-0" colSpan={grid.colCount + 2}>
                <button
                  type="button"
                  onClick={addRow}
                  aria-label="행 추가"
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60"
                >
                  <PlusIcon className="size-3.5" /> 행 추가
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </table>
        {/* Snapping drop indicator shown while moving a row/column. */}
        {dragLine ? (
          dragLine.axis === "col" ? (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-40 w-0.5 -translate-x-1/2 bg-primary"
              style={{ left: dragLine.px }}
            />
          ) : (
            <div
              className="pointer-events-none absolute right-0 left-0 z-40 h-0.5 -translate-y-1/2 bg-primary"
              style={{ top: dragLine.px }}
            />
          )
        ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Google Sheets-style freeform grid for the JSON-render catalog. Unlike
 * `DataTable` (rows = nodes), the whole grid lives in one node's jsonb property
 * (`property`, sparse A1 cells). Supports cell selection + drag-select, keyboard
 * nav, resizable columns (persisted in `grid.colWidths`), horizontal scroll,
 * inline `=` formula autocomplete (SUM/AVERAGE/MIN/MAX/COUNT), CSV copy,
 * plus-button add row/column at the grid edges, header-drag row/column reorder
 * (with a snapping drop indicator), click-header to select a whole row/column, and
 * formula "point mode" (arrow / Shift+arrow inserts a cell/range reference while
 * editing a formula at a reference position).
 */
export const spreadsheetComponents: Record<string, CatalogComponent> = {
  Spreadsheet: ({ props, bindingData }) => (
    <SpreadsheetEl
      node={boundNode(bindingData, props)}
      property={typeof props.property === "string" ? props.property : "grid"}
      title={props.title ? String(props.title) : undefined}
      setAction={typeof props.setAction === "string" ? props.setAction : undefined}
    />
  ),
};
