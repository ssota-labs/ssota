"use server";

import { tableViewStateSchema, type TableViewState } from "@ssota/contracts";
import { getPageViewStatePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Persist one table element's view state for the current user. The advanced data
 * table is controlled, so the client emits its full view state on change; this
 * upserts it keyed by (user, page, element). Validated server-side.
 */
export async function savePageViewState(args: {
  teamspaceId: string;
  pageId: string;
  elementId: string;
  viewState: TableViewState;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const viewState = tableViewStateSchema.parse(args.viewState);
  await getPageViewStatePort(args.teamspaceId).upsert({
    userId: user.id,
    pageId: args.pageId,
    elementId: args.elementId,
    viewState,
  });
}
