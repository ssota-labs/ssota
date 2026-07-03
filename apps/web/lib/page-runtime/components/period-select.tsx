"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { boundNodes } from "../bindings";
import { usePeriodFilter } from "../period-filter-context";
import type { CatalogComponent, RenderNode } from "../types";
import { SectionHeaderEnd, useSectionHeaderActions } from "./section-header-actions";

function readField(node: RenderNode, field: string): unknown {
  return field === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[field];
}

function PeriodSelectEl({
  nodes,
  field,
  label,
}: {
  nodes: RenderNode[];
  field: string;
  label?: string;
}) {
  const { period, setPeriod } = usePeriodFilter();
  const inSection = useSectionHeaderActions() !== null;

  const options = useMemo(() => {
    const values = new Set<string>();
    for (const node of nodes) {
      const raw = readField(node, field);
      if (typeof raw === "string" && raw.trim()) {
        values.add(raw.trim());
      }
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [field, nodes]);

  const control = useMemo(
    () => (
      <div className="flex items-center gap-2" data-testid="period-select">
        {label ? (
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
        ) : null}
        <Select
          value={period ?? "all"}
          onValueChange={(value) => setPeriod(value === "all" ? null : value)}
        >
          <SelectTrigger size="sm" className="h-8 min-w-[8.5rem]">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All periods</SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    [label, options, period, setPeriod],
  );

  if (options.length === 0) return null;

  if (inSection) {
    return <SectionHeaderEnd>{control}</SectionHeaderEnd>;
  }

  return control;
}

export const periodSelectComponents: Record<string, CatalogComponent> = {
  PeriodSelect: ({ props, bindingData }) => (
    <PeriodSelectEl
      nodes={boundNodes(bindingData, props)}
      field={typeof props.field === "string" ? props.field : "period"}
      label={typeof props.label === "string" ? props.label : undefined}
    />
  ),
};
