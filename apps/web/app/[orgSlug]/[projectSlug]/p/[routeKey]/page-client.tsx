"use client";

import type { JsonRenderSpec } from "@ssota/contracts";
import {
  DynamicPageRenderer,
  type OnAction,
} from "@/lib/lab-sandbox/dynamic-page-renderer";
import type { BindingContext } from "@/lib/lab-sandbox/binding-resolver";
import { runPageActionAction } from "./actions";

/**
 * Client wrapper for the agent-authored page: binds the page-action server
 * action to the renderer's `onAction` so interactive elements (Button/Form)
 * can mutate the graph.
 */
export function DynamicPageClient({
  spec,
  bindingData,
  orgSlug,
  projectSlug,
  routeKey,
}: {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  orgSlug: string;
  projectSlug: string;
  routeKey: string;
}) {
  const onAction: OnAction = (actionKey, input) =>
    runPageActionAction(orgSlug, projectSlug, routeKey, actionKey, input);

  return (
    <DynamicPageRenderer
      spec={spec}
      bindingData={bindingData}
      onAction={onAction}
      basePath={`/${orgSlug}/${projectSlug}`}
    />
  );
}
