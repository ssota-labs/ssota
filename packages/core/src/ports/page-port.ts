import type { Page, PageRecord } from "@ssota/contracts";

/**
 * Async, DB-backed page store (per-project, bound at construction like
 * {@link WorkflowPort}/TaskPort). Pages form a Notion-style tree: hierarchy is
 * `parentId`, addressing is flat by `id`. A page is a JSON-render dashboard, NOT
 * 1:1 with a node or workflow. Replaces the page-as-graph-node model
 * (`graphRead.queryNodes({catalogKey:"page"})` + `node.properties.definition`).
 */
export interface PagePort {
  /** All pages for the project (caller builds the tree from `parentId`). */
  listPages(): Promise<Page[]>;
  /** Direct children of `parentId` (null = top-level), ordered by `position`. */
  listChildren(parentId: string | null): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  getPageBySlug(slug: string): Promise<Page | null>;
  createPage(record: PageRecord): Promise<Page>;
  updatePage(id: string, patch: Partial<PageRecord>): Promise<Page | null>;
  /** Reparent / reorder a page within the tree. */
  movePage(
    id: string,
    parentId: string | null,
    position: number,
  ): Promise<Page | null>;
  deletePage(id: string): Promise<void>;
}
