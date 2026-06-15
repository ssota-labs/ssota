"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  PagePatternDocument,
  PagePatternHub,
  PagePatternList,
  PagePatternTree,
} from "@ssota/ui/components/page-patterns";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ssota/ui/components/ui/empty";
import { useLocale } from "@/components/i18n/locale-provider";
import { getRouteMeta } from "@/lib/console/route-node-map";

type ScaffoldedPageProps = {
  /** Project-relative path, e.g. `executive/roadmap` or `planning/prd` for initiative pages. */
  path: string;
  /** When set, builds full path as product/initiatives/:id/... */
  initiativeId?: string;
};

type EmptyRow = { id: string };

const emptyColumns: ColumnDef<EmptyRow>[] = [
  { accessorKey: "id", header: "ID" },
];

function ScaffoldEmpty({
  title,
  description,
  nodeTypeLabel,
}: {
  title: string;
  description: string;
  nodeTypeLabel: string;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description.replace("{type}", nodeTypeLabel)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ScaffoldedPage({ path, initiativeId }: ScaffoldedPageProps) {
  const { t } = useLocale();

  const fullPath = initiativeId
    ? path
      ? `product/initiatives/${initiativeId}/${path}`
      : `product/initiatives/${initiativeId}`
    : path;

  const meta = getRouteMeta(fullPath);
  const title = meta ? t(meta.titleKey) : path;
  const nodeTypeLabel = meta?.nodeTypes[0] ?? "item";
  const emptyTitle = t("scaffold.emptyTitle");
  const emptyDescription = t("scaffold.emptyDescription");

  const columns = useMemo(() => emptyColumns, []);

  if (!meta) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
    );
  }

  const empty = (
    <ScaffoldEmpty
      title={emptyTitle}
      description={emptyDescription}
      nodeTypeLabel={nodeTypeLabel}
    />
  );

  switch (meta.pattern) {
    case "H":
      return (
        <PagePatternHub
          quickLinks={[]}
          emptyState={empty}
          actions={meta.ctaKey ? <span className="text-xs text-muted-foreground">{t(meta.ctaKey)}</span> : undefined}
        />
      );
    case "D":
      return (
        <PagePatternDocument
          title={title}
          status="Draft"
          emptyState={empty}
          editLabel={meta.ctaKey ? t(meta.ctaKey) : t("scaffold.edit")}
        />
      );
    case "L":
      return (
        <PagePatternList
          columns={columns}
          data={[]}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription.replace("{type}", nodeTypeLabel)}
          newLabel={meta.ctaKey ? t(meta.ctaKey) : t("scaffold.new")}
        />
      );
    case "T":
      return (
        <PagePatternTree
          nodes={[]}
          emptyState={empty}
          newLabel={meta.ctaKey ? t(meta.ctaKey) : t("scaffold.new")}
        />
      );
    case "canvas":
      return (
        <div className="flex min-h-[24rem] flex-col items-center justify-center gap-2 p-6 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{t("scaffold.canvasPlaceholder")}</p>
        </div>
      );
    default:
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      );
  }
}
