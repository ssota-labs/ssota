import {
  pageRuntimeDefinitionSchema,
  workspaceDefinitionSchema,
  type PageRuntimeDefinition,
} from "@ssota/contracts";
import pagesSeed from "@ssota/contracts/seed-packs/dev-workflow/pages.json" with { type: "json" };
import workspaceSeed from "@ssota/contracts/seed-packs/dev-workflow/workspace.json" with { type: "json" };
import type { CatalogReadPort } from "../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../ports/graph-read-port.js";

type PageSeed = PageRuntimeDefinition & {
  pageKey: string;
  title: string;
};

type WorkspaceSeed = {
  nav: Array<{
    type: string;
    key?: string;
    label?: string;
    pageKey?: string;
    children?: Array<{ type: string; key: string; label: string; pageKey: string }>;
  }>;
};

export interface ApplyDevWorkflowPackResult {
  pageKeyToId: Map<string, string>;
  workspaceNodeId: string | null;
}

export interface ApplyDevWorkflowPackDeps {
  projectId: string;
  catalog: CatalogReadPort;
  graphRead: GraphReadPort;
  graphWrite: GraphWritePort;
  /** Adapter hook — seeds L1 catalog rows before pages/workspace. */
  ensureCatalog?: (projectId: string) => Promise<void>;
}

export async function applyDevWorkflowPack(
  deps: ApplyDevWorkflowPackDeps,
): Promise<ApplyDevWorkflowPackResult> {
  const { projectId, catalog, graphRead, graphWrite } = deps;

  if (deps.ensureCatalog) {
    await deps.ensureCatalog(projectId);
  }

  const pageKeyToId = new Map<string, string>();
  const pages = pagesSeed as PageSeed[];

  for (const page of pages) {
    const parsed = pageRuntimeDefinitionSchema.parse({
      routeKey: page.routeKey,
      scope: page.scope,
      spec: page.spec,
      bindings: page.bindings,
      context: page.context,
    });

    const pageCatalog = await catalog.getNodeCatalogByKey("page");
    if (!pageCatalog) {
      throw new Error("page catalog key missing — run ensureCatalog first");
    }

    const existing = await graphRead.queryNodes({
      projectId,
      catalogKey: "page",
      limit: 200,
    });
    const found = existing.find(
      (n) =>
        (n.properties as { routeKey?: string }).routeKey === parsed.routeKey,
    );

    if (found) {
      pageKeyToId.set(page.pageKey, found.id);
      continue;
    }

    const created = await graphWrite.createNode({
      projectId,
      nodeCatalogId: pageCatalog.id,
      catalogKey: "page",
      title: page.title,
      properties: {
        lifecycleStatus: "Active",
        ...parsed,
      },
      schemaVersion: 1,
    });
    pageKeyToId.set(page.pageKey, created.id);
  }

  const workspaceData = workspaceSeed as WorkspaceSeed;
  let workspaceNodeId: string | null = null;
  const workspaceCatalog = await catalog.getNodeCatalogByKey("workspace");

  if (workspaceCatalog && workspaceData.nav?.length) {
    const nav = workspaceData.nav
      .map((entry) => {
        if (entry.type === "section" && entry.children) {
          const children = entry.children
            .map((child) => {
              const pageNodeId = pageKeyToId.get(child.pageKey);
              if (!pageNodeId) return null;
              return {
                type: "link" as const,
                key: child.key,
                label: child.label,
                pageNodeId,
              };
            })
            .filter((child): child is NonNullable<typeof child> => child !== null);
          if (children.length === 0) return null;
          return {
            type: "section" as const,
            key: entry.key!,
            label: entry.label!,
            children,
          };
        }
        if (entry.type === "link" && entry.pageKey) {
          const pageNodeId = pageKeyToId.get(entry.pageKey);
          if (!pageNodeId) return null;
          return {
            type: "link" as const,
            key: entry.key!,
            label: entry.label!,
            pageNodeId,
          };
        }
        return { type: "separator" as const };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const workspaceDef = workspaceDefinitionSchema.parse({ nav });

    const existingWorkspace = await graphRead.queryNodes({
      projectId,
      catalogKey: "workspace",
      limit: 1,
    });

    if (existingWorkspace[0]) {
      workspaceNodeId = existingWorkspace[0].id;
    } else {
      const created = await graphWrite.createNode({
        projectId,
        nodeCatalogId: workspaceCatalog.id,
        catalogKey: "workspace",
        title: "Workspace",
        properties: {
          lifecycleStatus: "Active",
          nav: workspaceDef.nav,
        },
        schemaVersion: 1,
      });
      workspaceNodeId = created.id;
    }
  }

  return { pageKeyToId, workspaceNodeId };
}
