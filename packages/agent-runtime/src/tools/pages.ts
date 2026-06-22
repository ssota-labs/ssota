import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { getPagePort } from "../ports.js";
import { getRunContext } from "./context.js";

/**
 * Tools for the agent to author pages in the Notion-style page tree (the `pages`
 * table). A page is a JSON-render dashboard (NOT 1:1 with a node): it places
 * catalog components and loads node/edge data via `bindings`. Hierarchy is
 * `parentId` (a recursive tree); addressing is flat by `id`. Pages render at
 * `/{org}/{project}/p/{id}`.
 */
const SPEC_HELP =
  "spec: { root, elements } where each element is { type, props?, children? }. " +
  "Component types: PageHeader, Text, Badge, Card, Tabs, SplitPane, NodeList, " +
  "NodeTable, NodeField, NodeDocument, DocumentView, DocumentEditor, TokenList, " +
  "Widget, Form, Field, Button, Input, Textarea, Select. " +
  "bindings (kind: query|singleton|node|traverse|ref|artifact|subject) pull " +
  "graph data; an element references one via props.binding. `subject` resolves " +
  "the page's subjectNodeId.";

export function createPageTools(): ToolSet {
  return {
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
        try {
          const page = await getPagePort(ctx.projectId, ctx.accountId).createPage({
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
        try {
          const { id, ...patch } = input;
          const page = await getPagePort(ctx.projectId, ctx.accountId).updatePage(
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
        const page = await getPagePort(ctx.projectId, ctx.accountId).getPage(
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
        const pages = await getPagePort(ctx.projectId, ctx.accountId).listPages();
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
