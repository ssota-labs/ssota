"use client";

import Link from "next/link";
import { PagePatternHub } from "@ssota/ui/components/page-patterns";
import type { HubQuickLink, HubStatCard } from "@ssota/ui/components/page-patterns/page-pattern-hub";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatLocaleDate } from "@/lib/i18n/format";

type WorkflowPhaseSummary = {
  key: string;
  title: string;
  nodeCount: number;
  topTypes: Array<{ nodeType: string; label: string; count: number }>;
};

type OverviewHubProps = {
  stats: HubStatCard[];
  quickLinks: HubQuickLink[];
  recentActivity: { id: string; nodeType: string; title: string; updatedAt: string }[];
  nodesBasePath: string;
  graphPath: string;
  workflowSummary: WorkflowPhaseSummary[];
};

function WorkflowPreview({
  summary,
  graphPath,
}: {
  summary: WorkflowPhaseSummary[];
  graphPath: string;
}) {
  const activePhases = summary.filter((phase) => phase.nodeCount > 0).slice(0, 3);

  if (activePhases.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No graph nodes yet. Create research items or initiatives to populate the
          graph.
        </p>
        <Button
          render={<Link href={graphPath} />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          Open Graph
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {activePhases.map((phase) => (
          <div key={phase.key} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{phase.title}</span>
              <Badge variant="secondary">{phase.nodeCount}</Badge>
            </div>
            {phase.topTypes.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {phase.topTypes.map((type) => `${type.label} (${type.count})`).join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <Button
        render={<Link href={graphPath} />}
        variant="outline"
        size="sm"
        nativeButton={false}
      >
        Open Graph
      </Button>
    </div>
  );
}

export function OverviewHub({
  stats,
  quickLinks,
  recentActivity,
  nodesBasePath,
  graphPath,
  workflowSummary,
}: OverviewHubProps) {
  const { locale } = useLocale();

  return (
    <PagePatternHub
      stats={stats}
      quickLinks={quickLinks}
      graphSlot={
        <WorkflowPreview summary={workflowSummary} graphPath={graphPath} />
      }
      quickLinksSlot={
        recentActivity.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <ul className="divide-y rounded-lg border">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <Link
                    href={`${nodesBasePath}/${item.id}`}
                    className="font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {item.nodeType} · {formatLocaleDate(item.updatedAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
