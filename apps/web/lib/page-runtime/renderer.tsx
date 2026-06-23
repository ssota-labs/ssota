"use client";

import { Fragment, type ReactNode } from "react";
import type { JsonRenderSpec } from "@ssota/contracts";
import {
  ActionContext,
  BasePathContext,
  JsonRenderContext,
  PageViewStateContext,
  WidgetBuildContext,
  type OnAction,
  type PageViewStateRuntime,
} from "./context";
import { CATALOG } from "./registry";
import type { BindingContext } from "./types";

type RenderProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  /** Bound on the production route; omitted in the lab preview (buttons no-op). */
  onAction?: OnAction;
  /** `/{org}/{project}` prefix for in-page links. */
  basePath?: string;
  /** Triggers a server-side build for an unbuilt buildable Widget node. */
  onBuildWidget?: (nodeId: string) => void | Promise<void>;
  /** Stretch to fill a flex parent (DocumentSheetList / RoadmapSheetWorkspace pages). */
  fillHeight?: boolean;
  /** Per-user table view-state persistence (omitted in the lab preview). */
  viewState?: PageViewStateRuntime;
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

  // The catalog component is keyless; the renderer owns keys for tree placement.
  return (
    <Fragment key={elementId}>
      {component({ elementId, props, children, bindingData })}
    </Fragment>
  );
}

export function DynamicPageRenderer({
  spec,
  bindingData,
  onAction,
  basePath = "",
  onBuildWidget,
  fillHeight = false,
  viewState,
}: RenderProps) {
  const runtime = {
    spec,
    bindingData,
    renderElement: (elementId: string) =>
      renderElement(elementId, spec, bindingData),
  };

  return (
    <ActionContext.Provider value={onAction}>
      <WidgetBuildContext.Provider value={onBuildWidget}>
        <PageViewStateContext.Provider value={viewState ?? null}>
          <BasePathContext.Provider value={basePath}>
            <JsonRenderContext.Provider value={runtime}>
              <div
                className={
                  fillHeight ? "relative min-h-0 flex-1" : "space-y-2"
                }
                data-testid="dynamic-page-renderer"
              >
                {renderElement(spec.root, spec, bindingData)}
              </div>
            </JsonRenderContext.Provider>
          </BasePathContext.Provider>
        </PageViewStateContext.Provider>
      </WidgetBuildContext.Provider>
    </ActionContext.Provider>
  );
}
