import {
  pageRuntimeDefinitionSchema,
  workspaceDefinitionSchema,
  type PageRuntimeDefinition,
} from "@ssota/contracts";
import pagesSeed from "@ssota/contracts/seed-packs/software-development-workflow/pages.json" with { type: "json" };
import workspaceSeed from "@ssota/contracts/seed-packs/software-development-workflow/workspace.json" with { type: "json" };
import type { CatalogReadPort } from "../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../ports/graph-read-port.js";

/**
 * The starter domain seeded today. The pack mechanism is domain-neutral
 * (`applyDomainPack`); this is the one bundled domain (executive → testing
 * software-delivery workflow). Future domains add a sibling seed dir + id.
 */
export const SOFTWARE_DEV_WORKFLOW_DOMAIN_ID = "software-development-workflow";

type PageSeed = PageRuntimeDefinition & {
  pageKey: string;
  title: string;
};

/** Raw seed nav entry — arbitrarily nested; links target `href` or `pageKey`. */
interface RawNavEntry {
  type: string;
  key?: string;
  label?: string;
  labelKey?: string;
  href?: string;
  icon?: string;
  /** Resolved to a `pageNodeId` against seeded pages when present. */
  pageKey?: string;
  children?: RawNavEntry[];
}

type WorkspaceSeed = {
  nav: RawNavEntry[];
  navInitiative?: RawNavEntry[];
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

export async function applyDomainPack(
  deps: ApplyDevWorkflowPackDeps,
): Promise<ApplyDevWorkflowPackResult> {
  const { projectId, catalog, graphRead, graphWrite } = deps;

  if (deps.ensureCatalog) {
    await deps.ensureCatalog(projectId);
  }

  const pageKeyToId = new Map<string, string>();
  const pages = pagesSeed as unknown as PageSeed[];

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

  // Recursively map a raw seed entry to a WorkspaceNavEntry, preserving
  // href/labelKey/label/icon and resolving pageKey -> pageNodeId when present.
  // Links without a target (no href and unresolved pageKey) and empty
  // groups/sections collapse to null so they're dropped.
  const mapEntry = (entry: RawNavEntry): unknown => {
    if (entry.type === "separator") return { type: "separator" };
    if (entry.type === "link") {
      const pageNodeId = entry.pageKey ? pageKeyToId.get(entry.pageKey) : undefined;
      if (entry.href === undefined && !pageNodeId) return null;
      return {
        type: "link",
        key: entry.key,
        label: entry.label,
        ...(entry.labelKey ? { labelKey: entry.labelKey } : {}),
        ...(entry.href !== undefined ? { href: entry.href } : {}),
        ...(pageNodeId ? { pageNodeId } : {}),
        ...(entry.icon ? { icon: entry.icon } : {}),
      };
    }
    if (entry.type === "group" || entry.type === "section") {
      const children = (entry.children ?? [])
        .map(mapEntry)
        .filter((child): child is NonNullable<typeof child> => child !== null);
      if (children.length === 0) return null;
      return {
        type: entry.type,
        key: entry.key,
        label: entry.label,
        ...(entry.labelKey ? { labelKey: entry.labelKey } : {}),
        children,
      };
    }
    return null;
  };

  const mapNav = (entries: RawNavEntry[]): unknown[] =>
    entries.map(mapEntry).filter((e): e is NonNullable<typeof e> => e !== null);

  if (workspaceCatalog && workspaceData.nav?.length) {
    const workspaceDef = workspaceDefinitionSchema.parse({
      nav: mapNav(workspaceData.nav),
      ...(workspaceData.navInitiative
        ? { navInitiative: mapNav(workspaceData.navInitiative) }
        : {}),
    });

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
          domainId: SOFTWARE_DEV_WORKFLOW_DOMAIN_ID,
          nav: workspaceDef.nav,
          ...(workspaceDef.navInitiative
            ? { navInitiative: workspaceDef.navInitiative }
            : {}),
        },
        schemaVersion: 1,
      });
      workspaceNodeId = created.id;
    }
  }

  return { pageKeyToId, workspaceNodeId };
}
