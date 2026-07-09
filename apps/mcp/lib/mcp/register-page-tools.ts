import { z } from "zod";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createPageForMcp,
  getPageComponentForMcp,
  listPageComponentsForMcp,
  listPagesForMcp,
  readPageForMcp,
  updatePageForMcp,
} from "@/lib/api/page-services";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";

type McpToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
      extra: { authInfo?: AuthInfo },
    ) => Promise<unknown>,
  ) => void;
};

const SPEC_HELP =
  "spec: { root, elements } — each element is { type, props?, children? }. " +
  "Call list_page_components then get_page_component for the component catalog " +
  "(keys, props, example elements). An element wires data via props.binding " +
  "(a key in `bindings`; kinds: query|singleton|node|subject|traverse|ref|" +
  "url_selection|artifact) and mutations via props.action (a key in `actions`; " +
  "kinds: create_node|update_node|set_node_property|create_edge|delete_edge|" +
  "delete_node). Every binding/action a spec element references must be defined.";

export function registerPageTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_page_components",
    {
      title: "List Page Components",
      description:
        "List the json-render page component catalog (key, category, description). Call BEFORE authoring a page to learn the building blocks; then fetch a component's props + example with get_page_component. Progressive disclosure — don't try to hold the whole catalog; fetch detail as needed.",
      inputSchema: {},
    },
    async () => jsonContent(listPageComponentsForMcp()),
  );

  registerScopedProjectTool(
    server,
    "get_page_component",
    {
      title: "Get Page Component",
      description:
        "Get one page component's full descriptor: its props (name, type, required) and a copy-paste example element. Use while authoring a page spec.",
      inputSchema: { key: z.string().min(1) },
    },
    async ({ args }) => jsonContent(getPageComponentForMcp(String(args.key))),
  );

  registerScopedProjectTool(
    server,
    "create_page",
    {
      title: "Create Page",
      description:
        "Create a human-approvable page (a json-render dashboard) in the Notion-style page tree (pages table). " +
        SPEC_HELP,
      inputSchema: {
        title: z.string().min(1),
        parentId: z.string().uuid().nullable().optional(),
        subjectNodeId: z.string().uuid().nullable().optional(),
        appliesToNodeType: z.string().min(1).nullable().optional(),
        slug: z.string().min(1).optional(),
        icon: z.string().optional(),
        spec: z.record(z.unknown()),
        bindings: z.record(z.unknown()).optional(),
        actions: z.record(z.unknown()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createPageForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "update_page",
    {
      title: "Update Page",
      description:
        "Update a page by id (title/parentId/subjectNodeId/appliesToNodeType/slug/icon/spec/bindings/actions). " +
        SPEC_HELP,
      inputSchema: {
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        parentId: z.string().uuid().nullable().optional(),
        subjectNodeId: z.string().uuid().nullable().optional(),
        appliesToNodeType: z.string().min(1).nullable().optional(),
        slug: z.string().min(1).optional(),
        icon: z.string().optional(),
        spec: z.record(z.unknown()).optional(),
        bindings: z.record(z.unknown()).optional(),
        actions: z.record(z.unknown()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        const result = await updatePageForMcp(teamspaceId, args);
        return jsonContent(result ?? { error: "page not found" });
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "read_page",
    {
      title: "Read Page",
      description:
        "Read a page's full record (spec/bindings/actions) by id, or null if not found.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ teamspaceId, args }) =>
      jsonContent(await readPageForMcp(teamspaceId, String(args.id))),
  );

  registerScopedProjectTool(
    server,
    "list_pages",
    {
      title: "List Pages",
      description:
        "List the page tree (id, title, parentId, position, appliesToNodeType) for navigation/authoring.",
      inputSchema: {},
    },
    async ({ teamspaceId }) => jsonContent(await listPagesForMcp(teamspaceId)),
  );
}
