"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ssota/ui/components/ui/breadcrumb";
import { useLocale } from "@/components/i18n/locale-provider";
import { buildBreadcrumbSegments } from "@/lib/console/navigation";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";
import { useNodeDrill } from "./node-drill-context";

export function ConsoleBreadcrumb() {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);
  const drill = useNodeDrill();

  // Inside a node drill-in (/n/[id]...), show the node title + active page title
  // (dynamic, not i18n labelKeys). Otherwise the static route breadcrumb.
  const segments = drill
    ? [
        { label: drill.nodeTitle },
        ...(drill.pageTitle ? [{ label: drill.pageTitle }] : []),
      ]
    : buildBreadcrumbSegments(pathname, projectBase).map((s) => ({
        label: t(s.labelKey),
      }));

  return (
    <Breadcrumb aria-label="breadcrumb" className="min-w-0 flex-1 justify-center">
      <BreadcrumbList className="flex-nowrap justify-center">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <Fragment key={`${segment.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <span className="truncate text-muted-foreground">
                    {segment.label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
