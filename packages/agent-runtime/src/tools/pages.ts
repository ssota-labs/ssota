import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  listPageComponents,
  getPageComponent,
  isKnownPageComponent,
} from "@ssota/contracts/page";
import { getPagePort } from "../ports.js";
import { getRunContext } from "./context.js";

/** Collect element `type`s in a spec that aren't known page components. */
function unknownComponentTypes(spec: unknown): string[] {
  const elements = (spec as { elements?: unknown } | null | undefined)?.elements;
  if (!elements || typeof elements !== "object") return [];
  const bad = new Set<string>();
  for (const element of Object.values(elements as Record<string, unknown>)) {
    const type = (element as { type?: unknown } | null)?.type;
    if (typeof type === "string" && !isKnownPageComponent(type)) bad.add(type);
  }
  return [...bad];
}

function unknownComponentError(spec: unknown): { ok: false; error: string } | null {
  const unknown = unknownComponentTypes(spec);
  if (unknown.length === 0) return null;
  return {
    ok: false,
    error: `Unknown component type(s): ${unknown.join(", ")}. Call list_page_components for valid keys.`,
  };
}

/**
 * Tools for the agent to author pages in the Notion-style page tree (the `pages`
 * table). A page is a JSON-render dashboard (NOT 1:1 with a node): it places
 * catalog components and loads node/edge data via `bindings`. Hierarchy is
 * `parentId` (a recursive tree); addressing is flat by `id`. Pages render at
 * `/{org}/{project}/p/{id}`.
 */
const SPEC_HELP =
  "spec: { root, elements } where each element is { type, props?, children? }. " +
  "Call list_page_components / get_page_component for the component catalog " +
  "(keys, props, examples). bindings (kind: query|singleton|node|traverse|ref|" +
  "artifact|subject) pull graph data; an element references one via props.binding. " +
  "`subject` resolves the page's subjectNodeId.";

export function createPageTools(): ToolSet {
  return {
    list_page_components: tool({
      description:
        "List the json-render page component catalog (key, category, description). Call before authoring a page to learn the available building blocks; use get_page_component for a component's props and example.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          components: listPageComponents().map((c) => ({
            key: c.key,
            category: c.category,
            description: c.description,
            children: c.children,
          })),
        };
      },
    }),

    get_page_component: tool({
      description:
        "Get a page component's full descriptor: props (name, type, required) and a copy-paste example element. Use when authoring a page spec.",
      inputSchema: z.object({
        key: z.string().describe("Component key, e.g. 'NodeTable'."),
      }),
      execute: async (input) => {
        const descriptor = getPageComponent(input.key);
        if (!descriptor) {
          return {
            found: false,
            hint: "Unknown component. Call list_page_components for valid keys.",
          };
        }
        return { found: true, ...descriptor };
      },
    }),

    create_page: tool({
      description:
        "Create a page in the Notion-style page tree (pages table). " + SPEC_HELP,
      inputSchema: z.object({
        title: z.string().describe("Page title (shown in the sidebar tree)."),
        parentId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe("Parent page id for nesting; omit/null for a top-level page."),
        subjectNodeId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe("Optional anchor node id; exposed to bindings as `subject`."),
        spec: z.record(z.unknown()).describe("JSON-render spec { root, elements }."),
        bindings: z.record(z.unknown()).optional(),
        actions: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const badComponents = unknownComponentError(input.spec);
        if (badComponents) return badComponents;
        try {
          const page = await getPagePort(ctx.teamspaceId, ctx.accountId).createPage({
            title: input.title,
            parentId: input.parentId ?? null,
            subjectNodeId: input.subjectNodeId ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spec: input.spec as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bindings: (input.bindings ?? {}) as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            actions: (input.actions ?? {}) as any,
          });
          return { ok: true, id: page.id };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    update_page: tool({
      description:
        "Update a page by id (title/parentId/subjectNodeId/spec/bindings/actions). " +
        SPEC_HELP,
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().optional(),
        parentId: z.string().uuid().nullable().optional(),
        subjectNodeId: z.string().uuid().nullable().optional(),
        spec: z.record(z.unknown()).optional(),
        bindings: z.record(z.unknown()).optional(),
        actions: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        if (input.spec !== undefined) {
          const badComponents = unknownComponentError(input.spec);
          if (badComponents) return badComponents;
        }
        try {
          const { id, ...patch } = input;
          const page = await getPagePort(ctx.teamspaceId, ctx.accountId).updatePage(
            id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            patch as any,
          );
          if (!page) return { ok: false, error: "page not found" };
          return { ok: true, id: page.id };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    read_page: tool({
      description: "Read a page by id (returns its full record, or found:false).",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const page = await getPagePort(ctx.teamspaceId, ctx.accountId).getPage(
          input.id,
        );
        return page ?? { found: false };
      },
    }),

    list_pages: tool({
      description:
        "List all pages in the tree (id, title, parentId, position) for navigation/authoring.",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const pages = await getPagePort(ctx.teamspaceId, ctx.accountId).listPages();
        return {
          pages: pages.map((p) => ({
            id: p.id,
            title: p.title,
            parentId: p.parentId ?? null,
            position: p.position,
          })),
        };
      },
    }),
  };
}
