"use client";

import type { JsonRenderSpec } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { DynamicPageRenderer } from "./renderer";
import type { BindingContext } from "./types";
import { executePageAction } from "./page-actions";
import { pageUsesDocumentSheetList } from "./spec-utils";

type TreePageViewProps = {
  orgSlug: string;
  projectSlug: string;
  pageId: string;
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  basePath: string;
};

export function TreePageView({
  orgSlug,
  projectSlug,
  pageId,
  spec,
  bindingData,
  basePath,
}: TreePageViewProps) {
  const fillHeight = pageUsesDocumentSheetList(spec);

  return (
    <div
      className={cn(
        fillHeight
          ? "relative flex min-h-0 flex-1 flex-col"
          : "mx-auto w-full max-w-5xl",
      )}
    >
      <DynamicPageRenderer
        spec={spec}
        bindingData={bindingData}
        basePath={basePath}
        fillHeight={fillHeight}
        onAction={async (actionKey, payload) => {
          await executePageAction({
            orgSlug,
            projectSlug,
            pageId,
            actionKey,
            payload,
          });
        }}
      />
    </div>
  );
}
