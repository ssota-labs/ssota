import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  readPageDefinitionByRouteKey,
  writePageDefinition,
} from "@ssota/core";
import type { PageRuntimeDefinition } from "@ssota/contracts";
import { getGraphPorts, getGraphReadPort } from "../ports.js";
import { getRunContext, serializeNode } from "./context.js";

/**
 * Tools for the agent to author and own its page dashboard via the internal
 * JSON render. The definition is stored on a `page` node and rendered at
 * `/{org}/{project}/p/{routeKey}` — the agent's owned surface (page-unit).
 */
export function createPageTools(): ToolSet {
  return {
    write_page_definition: tool({
      description:
        "Author or update a page's JSON-render definition on a `page` node (create the node first with create_node, catalogKey 'page'). The definition has { routeKey, scope: 'project'|'evergreen'|'initiative', spec: { root, elements }, bindings }. Elements use types: PageHeader, Text, Badge, Card, NodeList, NodeDocument, NodeField, Tabs, SplitPane. Bindings (kind: query|singleton|node|traverse|ref) pull graph data; an element references one via props.binding. The page renders at /{org}/{project}/p/{routeKey}.",
      inputSchema: z.object({
        pageNodeId: z
          .string()
          .uuid()
          .describe("The `page` node this definition belongs to."),
        definition: z
          .record(z.unknown())
          .describe("A PageRuntimeDefinition object (validated server-side)."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        try {
          const node = await writePageDefinition(getGraphPorts(ctx.projectId), {
            projectId: ctx.projectId,
            nodeId: input.pageNodeId,
            definition: input.definition as unknown as PageRuntimeDefinition,
          });
          return { ok: true, node: serializeNode(node) };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    read_page_definition: tool({
      description:
        "Read the page definition registered for a routeKey (returns its owning nodeId and the definition, or found:false).",
      inputSchema: z.object({
        routeKey: z.string().describe("The page's routeKey."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const result = await readPageDefinitionByRouteKey(
          getGraphReadPort(ctx.projectId),
          ctx.projectId,
          input.routeKey,
        );
        return result ?? { found: false };
      },
    }),
  };
}
