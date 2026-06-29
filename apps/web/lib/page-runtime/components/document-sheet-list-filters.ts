import type { RenderNode } from "../types";
import { readNodeField, readRoadmapYear } from "./roadmap-doc-card";

export type DocumentSheetListFilterToggle = {
  type: "toggle";
  field: string;
  value: string;
  label: string;
  /** When true, rows where `field === value` are hidden until the toggle is on. */
  defaultHidden?: boolean;
};

export type DocumentSheetListFilterSelect = {
  type: "select";
  field: string;
  label: string;
};

export type DocumentSheetListFilter =
  | DocumentSheetListFilterToggle
  | DocumentSheetListFilterSelect;

export function parseDocumentSheetListFilters(
  value: unknown,
): DocumentSheetListFilter[] {
  if (!Array.isArray(value)) return [];
  const filters: DocumentSheetListFilter[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      record.type === "toggle" &&
      typeof record.field === "string" &&
      typeof record.value === "string" &&
      typeof record.label === "string"
    ) {
      filters.push({
        type: "toggle",
        field: record.field,
        value: record.value,
        label: record.label,
        defaultHidden: record.defaultHidden === true,
      });
      continue;
    }
    if (
      record.type === "select" &&
      typeof record.field === "string" &&
      typeof record.label === "string"
    ) {
      filters.push({
        type: "select",
        field: record.field,
        label: record.label,
      });
    }
  }
  return filters;
}

function filterKey(filter: DocumentSheetListFilter, index: number): string {
  if (filter.type === "toggle") {
    return `toggle:${filter.field}:${filter.value}:${index}`;
  }
  return `select:${filter.field}:${index}`;
}

export function buildInitialFilterState(
  filters: DocumentSheetListFilter[],
  nodes: RenderNode[],
  currentYear: number,
): Record<string, boolean | number> {
  const state: Record<string, boolean | number> = {};
  filters.forEach((filter, index) => {
    const key = filterKey(filter, index);
    if (filter.type === "toggle") {
      state[key] = false;
      return;
    }
    if (filter.field === "year") {
      const years = collectYearOptions(nodes, currentYear);
      state[key] = years[0] ?? currentYear;
      return;
    }
    state[key] = currentYear;
  });
  return state;
}

export function collectYearOptions(
  nodes: RenderNode[],
  currentYear: number,
): number[] {
  const years = nodes
    .map((node) => readRoadmapYear(node))
    .filter((year): year is number => typeof year === "number");
  return Array.from(new Set([currentYear, ...years])).sort((a, b) => b - a);
}

function readFilterFieldValue(node: RenderNode, field: string): string | number {
  if (field === "year") {
    const year = readRoadmapYear(node);
    return year ?? "";
  }
  const raw = node.properties[field];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return raw;
  return readNodeField(node, field);
}

export function applyDocumentSheetListFilters(
  nodes: RenderNode[],
  filters: DocumentSheetListFilter[],
  state: Record<string, boolean | number>,
): RenderNode[] {
  let result = nodes;
  filters.forEach((filter, index) => {
    const key = filterKey(filter, index);
    if (filter.type === "toggle") {
      const show = state[key] === true;
      if (!show) {
        result = result.filter(
          (node) => readFilterFieldValue(node, filter.field) !== filter.value,
        );
      }
      return;
    }
    const selected = state[key];
    result = result.filter(
      (node) => readFilterFieldValue(node, filter.field) === selected,
    );
  });
  return result;
}
