"use client";

import { Fragment, type ReactNode, Suspense } from "react";
import type { BindingDef, JsonRenderSpec } from "@ssota/contracts";
import {
  ActionContext,
  ArtifactWorkbenchContext,
  BasePathContext,
  JsonRenderContext,
  PageViewStateContext,
  WidgetBuildContext,
  type ArtifactWorkbenchRuntime,
  type OnAction,
  type PageViewStateRuntime,
} from "./context";
import { CATALOG } from "./registry";
import type { BindingContext } from "./types";
import { PeriodFilterProvider } from "./period-filter-context";
import {
  extractUrlSelectionBindings,
  SelectionProvider,
} from "./selection-context";

type RenderProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  pageBindings?: Record<string, BindingDef>;
  /** Bound on the production route; omitted in the lab preview (buttons no-op). */
  onAction?: OnAction;
  /** `/{org}/{project}` prefix for in-page links. */
  basePath?: string;
  /** Triggers a server-side build for an unbuilt buildable Widget node. */
  onBuildWidget?: (nodeId: string) => void | Promise<void>;
  /** Per-user table view-state persistence (omitted in the lab preview). */
  viewState?: PageViewStateRuntime;
  /** Artifact workbench callbacks (ArtifactWorkbench pages). */
  artifactWorkbench?: ArtifactWorkbenchRuntime | null;
};

function renderElement(
  elementId: string,
  spec: JsonRenderSpec,
  bindingData: BindingContext,
): ReactNode {
  const element = spec.elements[elementId];
  if (!element) return null;

  const children = (element.children ?? []).map((childId) =>
    renderElement(childId, spec, bindingData),
  );
  const props = element.props ?? {};

  const component = CATALOG[element.type];
  if (!component) {
    return (
      <div
        key={elementId}
        className="border-destructive/40 text-destructive rounded border border-dashed p-2 text-xs"
      >
        Unknown component: {element.type}
      </div>
    );
  }

  return (
    <Fragment key={elementId}>
      {component({ elementId, props, children, bindingData })}
    </Fragment>
  );
}

function SelectionWrappedTree({
  spec,
  bindingData,
  selectionConfig,
  children,
}: {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  selectionConfig: ReturnType<typeof extractUrlSelectionBindings>[number] | null;
  children: ReactNode;
}) {
  const selectionTree = selectionConfig ? (
    <Suspense fallback={children}>
      <SelectionProvider config={selectionConfig} bindingData={bindingData}>
        {children}
      </SelectionProvider>
    </Suspense>
  ) : (
    children
  );

  return (
    <Suspense fallback={selectionTree}>
      <PeriodFilterProvider>{selectionTree}</PeriodFilterProvider>
    </Suspense>
  );
}

export function DynamicPageRenderer({
  spec,
  bindingData,
  pageBindings = {},
  onAction,
  basePath = "",
  onBuildWidget,
  viewState,
  artifactWorkbench = null,
}: RenderProps) {
  const runtime = {
    spec,
    bindingData,
    renderElement: (elementId: string) =>
      renderElement(elementId, spec, bindingData),
  };

  const urlSelections = extractUrlSelectionBindings(pageBindings);
  const selectionConfig = urlSelections[0] ?? null;

  const tree = (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col"
      data-testid="dynamic-page-renderer"
    >
      {renderElement(spec.root, spec, bindingData)}
    </div>
  );

  return (
    <ActionContext.Provider value={onAction}>
      <WidgetBuildContext.Provider value={onBuildWidget}>
        <ArtifactWorkbenchContext.Provider value={artifactWorkbench}>
          <PageViewStateContext.Provider value={viewState ?? null}>
            <BasePathContext.Provider value={basePath}>
              <JsonRenderContext.Provider value={runtime}>
                <SelectionWrappedTree
                  spec={spec}
                  bindingData={bindingData}
                  selectionConfig={selectionConfig}
                >
                  {tree}
                </SelectionWrappedTree>
              </JsonRenderContext.Provider>
            </BasePathContext.Provider>
          </PageViewStateContext.Provider>
        </ArtifactWorkbenchContext.Provider>
      </WidgetBuildContext.Provider>
    </ActionContext.Provider>
  );
}
