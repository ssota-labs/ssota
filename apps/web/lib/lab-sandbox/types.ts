import type { PageRuntimeDefinition } from "@ssota/contracts";
import type { WorkspaceDefinition } from "@ssota/contracts";

export type MockNodeCatalogEntry = {
  id: string;
  key: string;
  label: string;
  propertySchema?: Record<string, unknown>;
};

export type MockEdgeCatalogEntry = {
  id: string;
  key: string;
  label: string;
  domainCatalogIds: string[];
  rangeCatalogIds: string[];
};

export type MockNode = {
  id: string;
  catalogKey: string;
  title: string;
  properties: Record<string, unknown>;
};

export type MockEdge = {
  id: string;
  catalogKey: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
};

export type MockPage = {
  id: string;
  pageKey: string;
  title: string;
  definition: PageRuntimeDefinition;
};

/** Seed-style nav uses pageKey; runtime workspace uses pageNodeId. */
export type MockWorkspaceSeed = {
  nav: Array<
    | { type: "separator" }
    | {
        type: "link";
        key: string;
        label: string;
        pageKey: string;
      }
    | {
        type: "section";
        key: string;
        label: string;
        children: Array<{
          type: "link";
          key: string;
          label: string;
          pageKey: string;
        }>;
      }
  >;
};

export type LabSandboxState = {
  nodeCatalog: MockNodeCatalogEntry[];
  edgeCatalog: MockEdgeCatalogEntry[];
  nodes: MockNode[];
  edges: MockEdge[];
  pages: MockPage[];
  workspace: MockWorkspaceSeed;
};

export type ResolvedWorkspace = WorkspaceDefinition;
