"use client";

import type { BindingDef, JsonRenderSpec } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { DynamicPageRenderer } from "./renderer";
import type {
  ArtifactWorkbenchRuntime,
  OnAction,
  PageViewStateRuntime,
} from "./context";
import type { BindingContext } from "./types";
import { pageUsesFillHeight } from "./spec-utils";

type TreePageViewProps = {
  spec: JsonRenderSpec;
  bindings: Record<string, BindingDef>;
  bindingData: BindingContext;
  basePath: string;
  onAction: OnAction;
  viewState?: PageViewStateRuntime;
  artifactWorkbench?: ArtifactWorkbenchRuntime | null;
};

export function TreePageView({
  spec,
  bindings,
  bindingData,
  basePath,
  onAction,
  viewState,
  artifactWorkbench = null,
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
        pageBindings={bindings}
        bindingData={bindingData}
        basePath={basePath}
        fillHeight={fillHeight}
        viewState={viewState}
        onAction={onAction}
        artifactWorkbench={artifactWorkbench}
      />
    </div>
  );
}
