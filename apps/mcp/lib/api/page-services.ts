import {
  getPageComponent,
  isKnownPageComponent,
  listPageComponents,
  pageRecordSchema,
  type PageRecord,
} from "@ssota/contracts/page";
import { getPagePort } from "@/lib/ports";

/**
 * S2 — page (json-render dashboard) authoring over MCP. Mirrors agent-runtime
 * `tools/pages.ts`: the UI component catalog is exposed as a progressive-
 * disclosure pair (list_page_components → get_page_component), and pages are
 * written to the `pages` table via the PagePort. Builder scope (no accountId).
 */

/** Collect element `type`s in a spec that aren't known page components. */
function unknownComponentTypes(spec: unknown): string[] {
  const elements = (spec as { elements?: unknown } | null | undefined)
    ?.elements;
  if (!elements || typeof elements !== "object") return [];
  const bad = new Set<string>();
  for (const element of Object.values(elements as Record<string, unknown>)) {
    const type = (element as { type?: unknown } | null)?.type;
    if (typeof type === "string" && !isKnownPageComponent(type)) bad.add(type);
  }
  return [...bad];
}

function assertKnownComponents(spec: unknown) {
  const unknown = unknownComponentTypes(spec);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown component type(s): ${unknown.join(", ")}. Call list_page_components for valid keys.`,
    );
  }
}

/** Progressive-disclosure manifest: light per-component summaries. */
export function listPageComponentsForMcp() {
  return {
    components: listPageComponents().map((c) => ({
      key: c.key,
      category: c.category,
      description: c.description,
      children: c.children,
    })),
  };
}

/** Progressive-disclosure detail: one component's props + example. */
export function getPageComponentForMcp(key: string) {
  const descriptor = getPageComponent(key);
  if (!descriptor) {
    return {
      found: false as const,
      hint: "Unknown component. Call list_page_components for valid keys.",
    };
  }
  return { found: true as const, ...descriptor };
}

export async function createPageForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  assertKnownComponents(input.spec);
  // Validates spec structure + binding/action references (refineSpecReferences).
  const record = pageRecordSchema.parse({
    title: input.title,
    icon: input.icon,
    slug: input.slug,
    parentId: input.parentId ?? null,
    subjectNodeId: input.subjectNodeId ?? null,
    appliesToNodeType: input.appliesToNodeType ?? null,
    spec: input.spec,
    bindings: input.bindings ?? {},
    actions: input.actions ?? {},
  });
  const page = await getPagePort(teamspaceId).createPage(record);
  return { id: page.id, title: page.title, parentId: page.parentId ?? null };
}

export async function updatePageForMcp(
  teamspaceId: string,
  input: Record<string, unknown>,
) {
  const id = String(input.id);
  const patch: Partial<PageRecord> = {};
  if (input.title !== undefined) patch.title = String(input.title);
  if (input.icon !== undefined) patch.icon = input.icon as string | undefined;
  if (input.slug !== undefined) patch.slug = input.slug as string | undefined;
  if (input.parentId !== undefined)
    patch.parentId = input.parentId as string | null;
  if (input.subjectNodeId !== undefined)
    patch.subjectNodeId = input.subjectNodeId as string | null;
  if (input.appliesToNodeType !== undefined)
    patch.appliesToNodeType = input.appliesToNodeType as string | null;
  if (input.spec !== undefined) {
    assertKnownComponents(input.spec);
    patch.spec = input.spec as PageRecord["spec"];
  }
  if (input.bindings !== undefined)
    patch.bindings = input.bindings as PageRecord["bindings"];
  if (input.actions !== undefined)
    patch.actions = input.actions as PageRecord["actions"];
  const page = await getPagePort(teamspaceId).updatePage(id, patch);
  if (!page) return null;
  return { id: page.id, title: page.title, parentId: page.parentId ?? null };
}

export async function readPageForMcp(teamspaceId: string, id: string) {
  const page = await getPagePort(teamspaceId).getPage(id);
  return page ?? null;
}

export async function listPagesForMcp(teamspaceId: string) {
  const pages = await getPagePort(teamspaceId).listPages();
  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    parentId: p.parentId ?? null,
    position: p.position,
    appliesToNodeType: p.appliesToNodeType ?? null,
  }));
}
