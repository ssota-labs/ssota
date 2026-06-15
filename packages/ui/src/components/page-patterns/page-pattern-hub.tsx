import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { PageFrame } from "./page-frame";

export type HubStatCard = {
  id: string;
  label: string;
  value: string | number;
  description?: string;
  badge?: string;
};

export type HubQuickLink = {
  id: string;
  label: string;
  description?: string;
};

type PagePatternHubProps = {
  stats?: HubStatCard[];
  graphSlot?: ReactNode;
  quickLinks?: HubQuickLink[];
  quickLinksSlot?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
};

export function PagePatternHub({
  stats = [],
  graphSlot,
  quickLinks = [],
  quickLinksSlot,
  filters,
  actions,
  emptyState,
  className,
}: PagePatternHubProps) {
  const hasContent =
    stats.length > 0 || graphSlot != null || quickLinks.length > 0 || quickLinksSlot != null;

  return (
    <PageFrame filters={filters} actions={actions} className={className}>
      {!hasContent && emptyState ? (
        emptyState
      ) : (
        <div className="space-y-6">
          {stats.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardDescription>{stat.label}</CardDescription>
                      {stat.badge ? (
                        <Badge variant="secondary">{stat.badge}</Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
                  </CardHeader>
                  {stat.description ? (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}

          {graphSlot ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow subgraph</CardTitle>
                <CardDescription>Mini graph preview for the current scope.</CardDescription>
              </CardHeader>
              <CardContent>{graphSlot}</CardContent>
            </Card>
          ) : null}

          {quickLinksSlot ??
            (quickLinks.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Quick links</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quickLinks.map((link) => (
                    <Card
                      key={link.id}
                      className={cn("transition-colors hover:bg-muted/40")}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{link.label}</CardTitle>
                        {link.description ? (
                          <CardDescription>{link.description}</CardDescription>
                        ) : null}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null)}
        </div>
      )}
    </PageFrame>
  );
}
