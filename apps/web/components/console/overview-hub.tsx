"use client";

import Link from "next/link";
import { PagePatternHub } from "@ssota/ui/components/page-patterns";
import type { HubQuickLink, HubStatCard } from "@ssota/ui/components/page-patterns/page-pattern-hub";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatLocaleDate } from "@/lib/i18n/format";

type OverviewHubProps = {
  stats: HubStatCard[];
  quickLinks: HubQuickLink[];
  recentActivity: { id: string; nodeType: string; title: string; updatedAt: string }[];
  nodesBasePath: string;
};

export function OverviewHub({
  stats,
  quickLinks,
  recentActivity,
  nodesBasePath,
}: OverviewHubProps) {
  const { locale } = useLocale();

  return (
    <PagePatternHub
      stats={stats}
      quickLinks={quickLinks}
      graphSlot={
        <p className="text-sm text-muted-foreground">
          Mini workflow graph preview lands in PR 10.
        </p>
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
