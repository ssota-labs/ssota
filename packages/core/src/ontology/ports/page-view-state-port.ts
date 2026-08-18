import type { TableViewState } from "@ssota/contracts";

/**
 * Per-user, per-table-element view state store for the advanced data table.
 * Keyed by (user, page, element); each user has an independent view of a table.
 * The table component is controlled, so this is the swappable persistence seam.
 */
export interface PageViewStatePort {
  /** All of a user's saved table view states for a page, keyed by element id. */
  getForPage(
    userId: string,
    pageId: string,
  ): Promise<Record<string, TableViewState>>;
  /** Upsert a single table element's view state for a user. */
  upsert(input: {
    userId: string;
    pageId: string;
    elementId: string;
    viewState: TableViewState;
  }): Promise<void>;
}
