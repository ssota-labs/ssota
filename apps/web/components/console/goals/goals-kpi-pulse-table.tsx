"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ssota/ui/components/ui/collapsible";
import { Button } from "@ssota/ui/components/ui/button";
import type { GoalKpiRow } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";

export function GoalsKpiPulseTable({ rows }: { rows: GoalKpiRow[] }) {
  const { t } = useLocale();

  if (rows.length === 0) return null;

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("goals.kpiPulse")}</h3>
        <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
          {t("goals.toggleKpiTable")}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-3">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("goals.table.kpi")}</th>
                <th className="px-3 py-2 font-medium">{t("goals.table.current")}</th>
                <th className="px-3 py-2 font-medium">{t("goals.table.baseline")}</th>
                <th className="px-3 py-2 font-medium">{t("goals.table.healthyTarget")}</th>
                <th className="px-3 py-2 font-medium">{t("goals.table.delta")}</th>
                <th className="px-3 py-2 font-medium">{t("goals.table.cadence")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.current ?? "—"}
                    {row.unit ? row.unit : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.baseline ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.target ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.delta !== undefined
                      ? `${row.delta > 0 ? "+" : ""}${row.delta}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.cadence ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
