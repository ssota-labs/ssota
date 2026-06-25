"use client";

import type { JsonRenderSpec } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { DynamicPageRenderer } from "./renderer";
import type {
  ComponentStudioRuntime,
  OnAction,
  PageViewStateRuntime,
} from "./context";
import type { BindingContext } from "./types";
import { pageUsesFillHeight } from "./spec-utils";

type TreePageViewProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  basePath: string;
  onAction: OnAction;
  viewState?: PageViewStateRuntime;
  componentStudio?: ComponentStudioRuntime | null;
};

export function TreePageView({
  spec,
  bindingData,
  basePath,
  onAction,
  viewState,
  componentStudio = null,
}: TreePageViewProps) {
  const fillHeight = pageUsesFillHeight(spec);

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
        viewState={viewState}
        onAction={onAction}
        componentStudio={componentStudio}
      />
    </div>
  );
}
