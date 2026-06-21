/**
 * Production page-runtime types. The JSON-render catalog lives here (promoted out
 * of the lab sandbox): these are the types the production `/{org}/{project}/p/{routeKey}`
 * route renders with. Domain-agnostic.
 */

/** A graph node as handed to the renderer (matches core's ResolvedNode). */
export type RenderNode = {
  id: string;
  catalogKey: string;
  title: string;
  properties: Record<string, unknown>;
};

/** Resolved binding data keyed by binding name. */
export type BindingContext = Record<string, unknown>;
