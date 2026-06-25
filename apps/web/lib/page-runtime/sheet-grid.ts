/**
 * Spreadsheet grid model + a small formula engine for the `Spreadsheet` catalog
 * component. Domain-agnostic: a single node carries the whole grid in one jsonb
 * property. Cells are stored sparsely keyed by A1 address; empty cells are absent.
 */

export type SheetCellValue = string | number | boolean | null;

export type SheetCell = {
  /** Raw entered value. A string starting with "=" is a formula. */
  value?: SheetCellValue;
};

export type SheetGrid = {
  rowCount: number;
  colCount: number;
  /** Sparse map: A1 address → cell. Empty cells are omitted. */
  cells: Record<string, SheetCell>;
  /** Per-column pixel widths, indexed by 0-based column. Sparse/short OK. */
  colWidths?: number[];
};

export const DEFAULT_ROW_COUNT = 12;
export const DEFAULT_COL_COUNT = 6;
export const DEFAULT_COL_WIDTH = 96;
export const MIN_COL_WIDTH = 48;

/** Normalize an unknown jsonb value into a well-formed SheetGrid. */
export function coerceGrid(value: unknown): SheetGrid {
  const v = (value ?? {}) as Partial<SheetGrid>;
  const cells =
    v.cells && typeof v.cells === "object" ? { ...v.cells } : {};
  const rowCount =
    typeof v.rowCount === "number" && v.rowCount > 0
      ? Math.floor(v.rowCount)
      : DEFAULT_ROW_COUNT;
  const colCount =
    typeof v.colCount === "number" && v.colCount > 0
      ? Math.floor(v.colCount)
      : DEFAULT_COL_COUNT;
  const colWidths = Array.isArray(v.colWidths)
    ? v.colWidths.map((w) => (typeof w === "number" && w > 0 ? w : DEFAULT_COL_WIDTH))
    : undefined;
  return { rowCount, colCount, cells, ...(colWidths ? { colWidths } : {}) };
}

// ── A1 address helpers ────────────────────────────────────────────────────

/** 0-based column index → letters (0 → "A", 25 → "Z", 26 → "AA"). */
export function colToLetters(col: number): string {
  let n = col;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Letters → 0-based column index ("A" → 0, "AA" → 26). */
export function lettersToCol(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** 0-based (row, col) → A1 address. */
export function toA1(row: number, col: number): string {
  return `${colToLetters(col)}${row + 1}`;
}

/** A1 address → 0-based { row, col }, or null if malformed. */
export function fromA1(addr: string): { row: number; col: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(addr.trim().toUpperCase());
  if (!m) return null;
  return { row: Number(m[2]) - 1, col: lettersToCol(m[1]!) };
}

/**
 * Move a row/column from index `from` to the snapped boundary `dropAt` (0..count),
 * remapping every cell's A1 address (and colWidths, for columns) to the new order.
 * Returns the same grid reference when the move is a no-op.
 */
export function reorderGrid(
  grid: SheetGrid,
  axis: "col" | "row",
  from: number,
  dropAt: number,
): SheetGrid {
  const count = axis === "col" ? grid.colCount : grid.rowCount;
  const order = Array.from({ length: count }, (_, i) => i);
  order.splice(from, 1);
  order.splice(dropAt > from ? dropAt - 1 : dropAt, 0, from);
  if (order.every((v, i) => v === i)) return grid;
  const posOf = new Map<number, number>();
  order.forEach((orig, pos) => posOf.set(orig, pos));

  const cells: Record<string, SheetCell> = {};
  for (const [addr, cell] of Object.entries(grid.cells)) {
    const rc = fromA1(addr);
    if (!rc) continue;
    const nr = axis === "row" ? posOf.get(rc.row) ?? rc.row : rc.row;
    const nc = axis === "col" ? posOf.get(rc.col) ?? rc.col : rc.col;
    cells[toA1(nr, nc)] = cell;
  }
  if (axis === "col") {
    const widths = grid.colWidths;
    const colWidths = order.map((orig) => widths?.[orig] ?? DEFAULT_COL_WIDTH);
    return { ...grid, cells, colWidths };
  }
  return { ...grid, cells };
}

/**
 * The innermost open function call at the end of `text` (cursor assumed at end),
 * plus how many args deep the cursor is. `=MIN(A1,` → { name:"MIN", argIndex:1 }.
 * Returns null when the cursor isn't inside any function's parentheses. Used to
 * drive the spreadsheet's signature-help popover.
 */
export function activeFunctionAt(
  text: string,
): { name: string; argIndex: number } | null {
  const stack: { name: string | null; argIndex: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9]/.test(text.charAt(j))) j++;
      const word = text.slice(i, j);
      if (text.charAt(j) === "(") {
        stack.push({ name: word.toUpperCase(), argIndex: 0 });
        i = j + 1;
        continue;
      }
      i = j;
      continue;
    }
    if (ch === "(") stack.push({ name: null, argIndex: 0 });
    else if (ch === ")") stack.pop();
    else if (ch === ",") {
      const top = stack[stack.length - 1];
      if (top) top.argIndex++;
    }
    i++;
  }
  for (let k = stack.length - 1; k >= 0; k--) {
    const frame = stack[k];
    if (frame?.name) return { name: frame.name, argIndex: frame.argIndex };
  }
  return null;
}

// ── Formula engine ─────────────────────────────────────────────────────────
//
// Supports: numeric literals, cell refs (A1), ranges (A1:B3), + - * / and
// parentheses, and the functions SUM, AVERAGE/AVG, MIN, MAX, COUNT. Evaluation
// memoizes per address and detects reference cycles.

const FN_NAMES = new Set(["SUM", "AVERAGE", "AVG", "MIN", "MAX", "COUNT"]);

type Token =
  | { t: "num"; v: number }
  | { t: "ref"; v: string }
  | { t: "range"; from: string; to: string }
  | { t: "fn"; v: string }
  | { t: "op"; v: string }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "comma" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input;
  // charAt returns "" past the end, which fails every char test below, so the
  // loop terminates safely without `string | undefined` indexing noise.
  while (i < s.length) {
    const ch = s.charAt(i);
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s.charAt(j))) j++;
      tokens.push({ t: "num", v: Number(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9]/.test(s.charAt(j))) j++;
      const word = s.slice(i, j).toUpperCase();
      i = j;
      // Range? A1:B3
      if (s.charAt(i) === ":") {
        let k = i + 1;
        while (k < s.length && /[A-Za-z0-9]/.test(s.charAt(k))) k++;
        tokens.push({ t: "range", from: word, to: s.slice(i + 1, k).toUpperCase() });
        i = k;
        continue;
      }
      if (FN_NAMES.has(word)) tokens.push({ t: "fn", v: word });
      else tokens.push({ t: "ref", v: word });
      continue;
    }
    throw new Error(`Unexpected char: ${ch}`);
  }
  return tokens;
}

/** Resolver: address → numeric value (non-numeric/empty treated as 0). */
type NumResolver = (addr: string) => number;

function rangeAddresses(from: string, to: string): string[] {
  const a = fromA1(from);
  const b = fromA1(to);
  if (!a || !b) throw new Error("bad range");
  const out: string[] = [];
  const r0 = Math.min(a.row, b.row);
  const r1 = Math.max(a.row, b.row);
  const c0 = Math.min(a.col, b.col);
  const c1 = Math.max(a.col, b.col);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) out.push(toA1(r, c));
  return out;
}

/** Recursive-descent parser/evaluator over the token stream. */
function evalTokens(tokens: Token[], resolve: NumResolver): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (peek()?.t === "op" && (peek() as { v: string }).v.match(/[+-]/)) {
      const op = (next() as { v: string }).v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (peek()?.t === "op" && (peek() as { v: string }).v.match(/[*/]/)) {
      const op = (next() as { v: string }).v;
      const right = parseFactor();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number {
    const tok = peek();
    if (!tok) throw new Error("unexpected end");
    if (tok.t === "op" && tok.v === "-") {
      next();
      return -parseFactor();
    }
    if (tok.t === "op" && tok.v === "+") {
      next();
      return parseFactor();
    }
    if (tok.t === "num") {
      next();
      return tok.v;
    }
    if (tok.t === "ref") {
      next();
      return resolve(tok.v);
    }
    if (tok.t === "lparen") {
      next();
      const v = parseExpr();
      if (peek()?.t !== "rparen") throw new Error("missing )");
      next();
      return v;
    }
    if (tok.t === "fn") {
      next();
      if (peek()?.t !== "lparen") throw new Error("fn needs (");
      next();
      const args: number[] = [];
      for (let a = peek(); a && a.t !== "rparen"; a = peek()) {
        if (a.t === "range") {
          next();
          for (const addr of rangeAddresses(a.from, a.to)) args.push(resolve(addr));
        } else {
          args.push(parseExpr());
        }
        if (peek()?.t === "comma") next();
      }
      if (peek()?.t !== "rparen") throw new Error("missing )");
      next();
      return applyFn(tok.v, args);
    }
    throw new Error("unexpected token");
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error("trailing tokens");
  return result;
}

function applyFn(name: string, args: number[]): number {
  switch (name) {
    case "SUM":
      return args.reduce((a, b) => a + b, 0);
    case "AVERAGE":
    case "AVG":
      return args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0;
    case "MIN":
      return args.length ? Math.min(...args) : 0;
    case "MAX":
      return args.length ? Math.max(...args) : 0;
    case "COUNT":
      return args.filter((n) => !Number.isNaN(n)).length;
    default:
      throw new Error(`unknown fn ${name}`);
  }
}

/**
 * Compute display values for every populated cell. Formulas (value starting
 * with "=") are evaluated with memoization + cycle detection; errors surface as
 * "#ERR!"/"#CYCLE!". Non-formula cells display their raw value.
 */
export function computeDisplay(grid: SheetGrid): Record<string, string> {
  const display: Record<string, string> = {};
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const resolveNum = (addr: string): number => {
    if (memo.has(addr)) return memo.get(addr) as number;
    if (visiting.has(addr)) throw new Error("#CYCLE!");
    const cell = grid.cells[addr];
    const raw = cell?.value;
    if (raw == null || raw === "") return 0;
    if (typeof raw === "number") {
      memo.set(addr, raw);
      return raw;
    }
    if (typeof raw === "boolean") return raw ? 1 : 0;
    const str = String(raw);
    if (str.startsWith("=")) {
      visiting.add(addr);
      const n = evalTokens(tokenize(str.slice(1)), resolveNum);
      visiting.delete(addr);
      memo.set(addr, n);
      return n;
    }
    const n = Number(str);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const [addr, cell] of Object.entries(grid.cells)) {
    const raw = cell?.value;
    if (raw == null || raw === "") continue;
    const str = String(raw);
    if (str.startsWith("=")) {
      try {
        const n = resolveNum(addr);
        display[addr] = formatNumber(n);
      } catch (err) {
        display[addr] =
          err instanceof Error && err.message === "#CYCLE!" ? "#CYCLE!" : "#ERR!";
      }
    } else {
      display[addr] = str;
    }
  }
  return display;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "#ERR!";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
}
