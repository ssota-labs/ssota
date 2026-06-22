"use client";

import { Fragment, type ReactNode } from "react";
import type { JsonRenderSpec } from "@ssota/contracts";
import {
  ActionContext,
  BasePathContext,
  WidgetBuildContext,
  type OnAction,
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
}: RenderProps) {
  return (
    <ActionContext.Provider value={onAction}>
      <WidgetBuildContext.Provider value={onBuildWidget}>
        <BasePathContext.Provider value={basePath}>
          <div className="space-y-2" data-testid="dynamic-page-renderer">
            {renderElement(spec.root, spec, bindingData)}
          </div>
        </BasePathContext.Provider>
      </WidgetBuildContext.Provider>
    </ActionContext.Provider>
  );
}
