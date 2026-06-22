import type { ReactNode } from "react";

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

/** A token definition for TokenList (domain-agnostic; supplied via props). */
export type TokenDef = {
  name: string;
  label?: string;
  kind?: "color" | "length" | "font" | "select";
  options?: string[];
};

/** Args passed to every catalog component renderer. */
export type CatalogRenderArgs = {
  elementId: string;
  props: Record<string, unknown>;
  children: ReactNode[];
  bindingData: BindingContext;
};

/**
 * A catalog component: builds props from the element + bindings and returns the
 * element to render. MUST NOT call hooks directly — delegate hook/stateful logic
 * to a real component it returns (e.g. `<TokenListEl .../>`).
 */
export type CatalogComponent = (args: CatalogRenderArgs) => ReactNode;
