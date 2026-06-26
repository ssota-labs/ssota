import type { JsonRenderSpec } from "@ssota/contracts";
import type { PagePort } from "@ssota/core";
import {
  projectPath,
  type ProjectRouteContext,
} from "@/lib/console/paths";

/** True when the spec is a lone PageHeader placeholder (hub shell). */
export function isHubPage(spec: JsonRenderSpec): boolean {
  const root = spec.elements[spec.root];
  if (!root || root.type !== "PageHeader") return false;
  const keys = Object.keys(spec.elements);
  return keys.length === 1 && keys[0] === spec.root;
}

/**
 * Hub pages redirect to their first child (by position). Returns null when the
 * page is not a hub or has no children.
 */
export async function resolveHubRedirectPath(
  pagePort: PagePort,
  pageId: string,
  routeCtx: ProjectRouteContext,
  nodeId?: string,
): Promise<string | null> {
  const children = await pagePort.listChildren(pageId);
  const first = children[0];
  if (!first) return null;
  if (nodeId) {
    return projectPath(routeCtx, "n", nodeId, "p", first.id);
  }
  return projectPath(routeCtx, "p", first.id);
}
