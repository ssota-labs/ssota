"use client";

import type { JsonRenderSpec } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { DynamicPageRenderer } from "./renderer";
import type { OnAction } from "./context";
import type { BindingContext } from "./types";
import { pageUsesDocumentSheetList } from "./spec-utils";

type TreePageViewProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  basePath: string;
  onAction: OnAction;
};

export function TreePageView({
  spec,
  bindingData,
  basePath,
  onAction,
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
        onAction={onAction}
      />
    </div>
  );
}
