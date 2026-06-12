"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ssota/ui/components/ui/breadcrumb";
import { useLocale } from "@/components/i18n/locale-provider";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const segmentLabelKeys: Record<string, string> = {
  graph: "breadcrumbs.graph",
  nodes: "breadcrumbs.nodes",
  edges: "breadcrumbs.edges",
  actions: "breadcrumbs.actions",
  instructions: "breadcrumbs.instructions",
  gates: "breadcrumbs.gates",
  impact: "breadcrumbs.impact",
  log: "breadcrumbs.log",
  settings: "breadcrumbs.settings",
  general: "breadcrumbs.general",
  verticals: "breadcrumbs.verticals",
  "homepage-agent": "breadcrumbs.homepageAgent",
};

function titleCaseSlug(slug: string) {
  return decodeURIComponent(slug)
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ConsoleBreadcrumbs() {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const base = projectPath(ctx);
  const relative = pathname.startsWith(base)
    ? pathname.slice(base.length).replace(/^\//, "")
    : "";
  const segments = relative ? relative.split("/") : [];

  const crumbs: { href?: string; label: string }[] = [];

  let pathAcc = base;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    pathAcc = `${pathAcc}/${segment}`;
    const isLast = i === segments.length - 1;
    const prev = segments[i - 1];
    const labelKey = segmentLabelKeys[segment];
    const label =
      (labelKey ? t(labelKey) : undefined) ??
      (prev === "nodes" || prev === "edges" ? titleCaseSlug(segment) : titleCaseSlug(segment));

    crumbs.push(isLast ? { label } : { href: pathAcc, label });
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
