/**
 * Card-template interpolation for FlowCanvas nodes. A node's `card` is a normal
 * `JsonRenderSpec` (UI-catalog element tree). Before it is handed to the
 * DynamicPageRenderer we substitute `{{path}}` tokens in string props with values
 * from the node's properties (+ title + the shared `view` state), and drop any
 * element marked `props.when: "<key>"` whose key is falsy in the context — that's
 * how the right panel's metric toggles hide/show rows on every card.
 *
 * This keeps node cards fully catalog-defined and domain-agnostic: the card uses
 * the same Text/Badge/Card/SplitPane/NodeField vocabulary as a page.
 */

import type { JsonRenderSpec } from "@ssota/contracts";

type Ctx = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Read a dotted path (`view.payroll`) out of the interpolation context. */
export function getPath(ctx: Ctx, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : undefined), ctx);
}

function interpolateValue(value: unknown, ctx: Ctx): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
      const v = getPath(ctx, path);
      return v === undefined || v === null ? "" : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolateValue(v, ctx));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolateValue(v, ctx);
    return out;
  }
  return value;
}

/** True when an element should render given its optional `when` gate. */
function passesWhen(props: Record<string, unknown> | undefined, ctx: Ctx): boolean {
  if (!props || typeof props.when !== "string") return true;
  return Boolean(getPath(ctx, props.when));
}

/**
 * Produce a render-ready spec: `{{path}}` substituted, `when`-gated elements
 * pruned (and pruned from parents' `children` lists).
 */
export function interpolateCardSpec(spec: JsonRenderSpec, ctx: Ctx): JsonRenderSpec {
  const elements: JsonRenderSpec["elements"] = {};
  const dropped = new Set<string>();

  for (const [id, el] of Object.entries(spec.elements)) {
    if (!passesWhen(el.props, ctx)) {
      dropped.add(id);
      continue;
    }
    elements[id] = {
      ...el,
      ...(el.props
        ? { props: interpolateValue(el.props, ctx) as Record<string, unknown> }
        : {}),
      ...(el.children
        ? { children: el.children.filter((c) => !dropped.has(c)) }
        : {}),
    };
  }

  // Second pass: drop now-removed ids from any children list (handles forward refs).
  for (const el of Object.values(elements)) {
    if (el.children) el.children = el.children.filter((c) => !dropped.has(c));
  }

  return { ...spec, elements };
}
