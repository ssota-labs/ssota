/**
 * Entity-relationship model for the `ErdDiagram` catalog component. Domain-agnostic:
 * a single node carries the whole schema (tables + columns + relations + optional
 * coordinates) in one jsonb property — the same single-node-jsonb pattern as the
 * Spreadsheet (`sheet-grid.ts`) and FlowCanvas (`flow-model.ts`) components.
 *
 * The shape is deliberately database-flavoured (tables/columns/PK/FK/relations with
 * crow's-foot cardinality) but carries no domain concepts — any schema can be
 * described with it. Layout reuses FlowCanvas's ELK engine: `erdToFlowModel` maps
 * each table to a sized flow node so `layoutFlow` can place them without overlap.
 */

import { asColorToken, type FlowColorToken } from "./flow-tokens";
import type { FlowModel } from "./flow-model";

/** One column/field of a table. */
export type ErdColumn = {
  name: string;
  /** SQL-ish type label, shown muted on the right (e.g. "uuid", "varchar(255)"). */
  type?: string;
  /** Primary key — rendered with a key glyph + bold name. */
  pk?: boolean;
  /** Foreign key — rendered with a link glyph (also inferred from relations). */
  fk?: boolean;
  /** NOT NULL when true (shows an "NN" tag). */
  notNull?: boolean;
  /** UNIQUE when true (shows a "UQ" tag). */
  unique?: boolean;
};

/** One entity/table. */
export type ErdTable = {
  id: string;
  name: string;
  columns: ErdColumn[];
  /** Optional persisted coordinates. Absent → ELK auto-layout assigns them. */
  x?: number;
  y?: number;
  /** Header accent color token (red|orange|amber|green|blue|purple|pink|gray). */
  color?: FlowColorToken | string;
  /** Optional muted subtitle under the table name. */
  note?: string;
};

/** Crow's-foot cardinality between two tables (source:target). */
export type ErdCardinality = "1:1" | "1:N" | "N:1" | "N:M";

/** A foreign-key / relationship between two tables (optionally column-to-column). */
export type ErdRelation = {
  id: string;
  source: string;
  sourceColumn?: string;
  target: string;
  targetColumn?: string;
  cardinality?: ErdCardinality;
  label?: string;
};

export type ErdModel = {
  tables: ErdTable[];
  relations: ErdRelation[];
};

// ── Geometry (kept here so layout + the node component agree on table sizing) ──
export const ERD_HEADER_HEIGHT = 38;
export const ERD_ROW_HEIGHT = 26;
export const ERD_BODY_PAD = 8;
export const ERD_MIN_WIDTH = 196;
export const ERD_MAX_WIDTH = 340;
/** Approx px per character — sizes the card to the widest "name  type" line. */
const CHAR_WIDTH = 7;
/** Fixed slack for the icon gutter + gap between name and type. */
const ROW_SLACK = 58;

const CARDINALITIES: readonly ErdCardinality[] = ["1:1", "1:N", "N:1", "N:M"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function coerceColumn(raw: unknown): ErdColumn | null {
  if (!isRecord(raw)) return null;
  const name =
    typeof raw.name === "string" && raw.name.length > 0
      ? raw.name
      : typeof raw.column === "string" && raw.column.length > 0
        ? raw.column
        : null;
  if (!name) return null;
  const col: ErdColumn = { name };
  if (typeof raw.type === "string") col.type = raw.type;
  if (raw.pk === true || raw.primaryKey === true) col.pk = true;
  if (raw.fk === true || raw.foreignKey === true) col.fk = true;
  // Accept either `notNull` or the inverse `nullable` flag.
  if (raw.notNull === true || raw.nullable === false) col.notNull = true;
  if (raw.unique === true) col.unique = true;
  return col;
}

function coerceTable(raw: unknown, index: number): ErdTable | null {
  if (!isRecord(raw)) return null;
  const id =
    typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `t${index}`;
  const name =
    typeof raw.name === "string"
      ? raw.name
      : typeof raw.title === "string"
        ? raw.title
        : id;
  const rawCols = Array.isArray(raw.columns)
    ? raw.columns
    : Array.isArray(raw.fields)
      ? raw.fields
      : [];
  const columns = rawCols
    .map((c) => coerceColumn(c))
    .filter((c): c is ErdColumn => c !== null);
  const table: ErdTable = { id, name, columns };
  if (typeof raw.x === "number") table.x = raw.x;
  if (typeof raw.y === "number") table.y = raw.y;
  if (typeof raw.color === "string") table.color = raw.color;
  if (typeof raw.note === "string") table.note = raw.note;
  return table;
}

function coerceRelation(
  raw: unknown,
  index: number,
  tableIds: Set<string>,
): ErdRelation | null {
  if (!isRecord(raw)) return null;
  const source =
    typeof raw.source === "string"
      ? raw.source
      : typeof raw.from === "string"
        ? raw.from
        : undefined;
  const target =
    typeof raw.target === "string"
      ? raw.target
      : typeof raw.to === "string"
        ? raw.to
        : undefined;
  if (!source || !target) return null;
  // Drop relations that dangle (reference a table not in the set).
  if (!tableIds.has(source) || !tableIds.has(target)) return null;
  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : `r${index}-${source}-${target}`;
  const rel: ErdRelation = { id, source, target };
  if (typeof raw.sourceColumn === "string") rel.sourceColumn = raw.sourceColumn;
  if (typeof raw.targetColumn === "string") rel.targetColumn = raw.targetColumn;
  if (
    typeof raw.cardinality === "string" &&
    CARDINALITIES.includes(raw.cardinality as ErdCardinality)
  ) {
    rel.cardinality = raw.cardinality as ErdCardinality;
  }
  if (typeof raw.label === "string") rel.label = raw.label;
  return rel;
}

/** Normalize an unknown jsonb value into a well-formed ErdModel. */
export function coerceErd(value: unknown): ErdModel {
  const v = isRecord(value) ? value : {};
  const rawTables = Array.isArray(v.tables)
    ? v.tables
    : Array.isArray(v.entities)
      ? v.entities
      : [];
  const tables = rawTables
    .map((t, i) => coerceTable(t, i))
    .filter((t): t is ErdTable => t !== null);
  const tableIds = new Set(tables.map((t) => t.id));
  const rawRels = Array.isArray(v.relations)
    ? v.relations
    : Array.isArray(v.edges)
      ? v.edges
      : [];
  const relations = rawRels
    .map((r, i) => coerceRelation(r, i, tableIds))
    .filter((r): r is ErdRelation => r !== null);
  // Mark FK columns referenced by relations so they render with the link glyph
  // even when the source data didn't set `fk` explicitly.
  for (const rel of relations) {
    if (!rel.sourceColumn) continue;
    const table = tables.find((t) => t.id === rel.source);
    const col = table?.columns.find((c) => c.name === rel.sourceColumn);
    if (col && !col.pk) col.fk = true;
  }
  return { tables, relations };
}

/** Pixel size of a table card (header + one row per column). */
export function erdTableSize(table: ErdTable): {
  width: number;
  height: number;
} {
  const longest = table.columns.reduce((max, c) => {
    const len = c.name.length + (c.type?.length ?? 0);
    return Math.max(max, len);
  }, table.name.length);
  const width = Math.min(
    ERD_MAX_WIDTH,
    Math.max(ERD_MIN_WIDTH, longest * CHAR_WIDTH + ROW_SLACK),
  );
  const height =
    ERD_HEADER_HEIGHT + table.columns.length * ERD_ROW_HEIGHT + ERD_BODY_PAD;
  return { width, height };
}

/**
 * Map the ERD onto a FlowModel so the shared ELK engine (`layoutFlow`) can place
 * the tables. Each table becomes a sized flow node; each relation becomes a flow
 * edge so ELK keeps related tables near each other.
 */
export function erdToFlowModel(model: ErdModel): FlowModel {
  return {
    nodes: model.tables.map((t) => {
      const { width, height } = erdTableSize(t);
      return {
        id: t.id,
        title: t.name,
        width,
        height,
        ...(typeof t.x === "number" ? { x: t.x } : {}),
        ...(typeof t.y === "number" ? { y: t.y } : {}),
      };
    }),
    edges: model.relations.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
    })),
  };
}

/** The two marker ends a cardinality implies (source side, target side). */
export type ErdEnd = "one" | "many";

export function cardinalityEnds(c: ErdCardinality | undefined): {
  source: ErdEnd;
  target: ErdEnd;
} {
  switch (c) {
    case "1:1":
      return { source: "one", target: "one" };
    case "N:1":
      return { source: "many", target: "one" };
    case "N:M":
      return { source: "many", target: "many" };
    case "1:N":
    default:
      return { source: "one", target: "many" };
  }
}

/** Resolve a table's header accent classes-token (falls back to gray). */
export function erdTableColor(table: ErdTable): FlowColorToken {
  return asColorToken(table.color);
}

// ── ReactFlow handle ids (shared so the node + diagram agree) ────────────────
// A relation anchors to a column (or the whole table when no column is given).
// Each anchor exposes a source + target handle on BOTH sides; the diagram picks
// the side that gives the cleanest left↔right routing from the laid-out coords.
export const ERD_TABLE_ANCHOR = "tbl";

/** Anchor key for a column (or the table) — namespaced so names can't collide. */
export function erdAnchorKey(column?: string): string {
  return column ? `col:${column}` : ERD_TABLE_ANCHOR;
}

/** Handle id for an anchor on a side (l|r) acting as a source (s) or target (t). */
export function erdHandleId(
  anchorKey: string,
  side: "l" | "r",
  type: "s" | "t",
): string {
  return `${anchorKey}__${side}__${type}`;
}
