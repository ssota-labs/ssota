"use client";

import type { GoalObjectiveRow } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { ObjectiveCard } from "./objective-card";
import { KeyResultRow } from "./key-result-row";

type GoalsOkrTreeProps = {
  objectives: GoalObjectiveRow[];
  unlinkedKeyResults: Parameters<typeof KeyResultRow>[0]["row"][];
  nodesBasePath: string;
};

export function GoalsOkrTree({
  objectives,
  unlinkedKeyResults,
  nodesBasePath,
}: GoalsOkrTreeProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      {objectives.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          objective={objective}
          nodesBasePath={nodesBasePath}
        />
      ))}
      {unlinkedKeyResults.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-dashed p-4">
          <h3 className="text-sm font-semibold">{t("goals.unlinkedKeyResults")}</h3>
          {unlinkedKeyResults.map((kr) => (
            <KeyResultRow key={kr.id} row={kr} nodesBasePath={nodesBasePath} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
