/**
 * Color tokens for the `FlowCanvas` catalog component. Domain-agnostic: a node's
 * visual variant (supplied via the `nodePresentation` manifest) names one of these
 * tokens, and the generic FlowNode derives its surface/border/ring from the static
 * Tailwind class map below.
 *
 * Tailwind-first: classes are FULL static strings (never `bg-${c}-100` — that gets
 * purged by the JIT). The only hex we keep is a tiny token→rgb map used for the
 * selection glow, which needs a real color value inside a CSS `filter`/`box-shadow`.
 * Adapted from ssota-labs `style-tokens.types.ts` (`COLOR_TOKEN_CLASSES`).
 */

export type FlowColorToken =
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

export type FlowColorClasses = {
  /** Node surface (light/dark). */
  surface: string;
  /** Border. */
  border: string;
  /** Title/label text. */
  text: string;
  /** Selection ring (applied when the RF node is selected). */
  ring: string;
};

export const FLOW_COLOR_CLASSES: Record<FlowColorToken, FlowColorClasses> = {
  red: {
    surface: "bg-red-100 dark:bg-red-950",
    border: "border-red-300 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    ring: "ring-red-400",
  },
  orange: {
    surface: "bg-orange-100 dark:bg-orange-950",
    border: "border-orange-300 dark:border-orange-800",
    text: "text-orange-900 dark:text-orange-100",
    ring: "ring-orange-400",
  },
  amber: {
    surface: "bg-amber-100 dark:bg-amber-950",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    ring: "ring-amber-400",
  },
  green: {
    surface: "bg-green-100 dark:bg-green-950",
    border: "border-green-300 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    ring: "ring-green-400",
  },
  blue: {
    surface: "bg-blue-100 dark:bg-blue-950",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    ring: "ring-blue-400",
  },
  purple: {
    surface: "bg-purple-100 dark:bg-purple-950",
    border: "border-purple-300 dark:border-purple-800",
    text: "text-purple-900 dark:text-purple-100",
    ring: "ring-purple-400",
  },
  pink: {
    surface: "bg-pink-100 dark:bg-pink-950",
    border: "border-pink-300 dark:border-pink-800",
    text: "text-pink-900 dark:text-pink-100",
    ring: "ring-pink-400",
  },
  gray: {
    surface: "bg-gray-100 dark:bg-gray-900",
    border: "border-gray-300 dark:border-gray-700",
    text: "text-gray-900 dark:text-gray-100",
    ring: "ring-gray-400",
  },
};

/** token → `rgb(r,g,b)` (Tailwind 400 tone) for the selection glow filter. */
export const FLOW_GLOW_RGB: Record<FlowColorToken, string> = {
  red: "rgb(248,113,113)",
  orange: "rgb(251,146,60)",
  amber: "rgb(251,191,36)",
  green: "rgb(74,222,128)",
  blue: "rgb(96,165,250)",
  purple: "rgb(192,132,252)",
  pink: "rgb(244,114,182)",
  gray: "rgb(156,163,175)",
};

const DEFAULT_TOKEN: FlowColorToken = "gray";

/** Coerce an arbitrary string into a known color token (falls back to gray). */
export function asColorToken(value: unknown): FlowColorToken {
  return typeof value === "string" && value in FLOW_COLOR_CLASSES
    ? (value as FlowColorToken)
    : DEFAULT_TOKEN;
}

export function flowColorClasses(token: unknown): FlowColorClasses {
  return FLOW_COLOR_CLASSES[asColorToken(token)];
}

export function flowGlowRgb(token: unknown): string {
  return FLOW_GLOW_RGB[asColorToken(token)];
}
