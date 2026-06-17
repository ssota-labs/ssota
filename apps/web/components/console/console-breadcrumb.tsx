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

type ConsoleBreadcrumbProps = {
  initiativeTitle?: string;
};

export function ConsoleBreadcrumb({ initiativeTitle }: ConsoleBreadcrumbProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);

  const segments = buildBreadcrumbSegments(pathname, projectBase, initiativeTitle);

  return (
    <Breadcrumb aria-label="breadcrumb" className="min-w-0 flex-1 justify-center">
      <BreadcrumbList className="flex-nowrap justify-center">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const label =
            segment.labelKey === "nav.initiativeTitle" && initiativeTitle
              ? initiativeTitle
              : t(segment.labelKey);

          return (
            <Fragment key={`${segment.labelKey}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">{label}</BreadcrumbPage>
                ) : (
                  <span className="truncate text-muted-foreground">{label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
