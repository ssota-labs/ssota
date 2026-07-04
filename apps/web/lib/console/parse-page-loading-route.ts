import { DEFAULT_TEAMSPACE_SLUG } from "@/lib/console/constants";

export type ParsedPageLoadingRoute =
  | {
      kind: "page";
      orgSlug: string;
      teamspaceSlug: string;
      pageId: string;
    }
  | {
      kind: "node-page";
      orgSlug: string;
      teamspaceSlug: string;
      nodeId: string;
      pageId: string;
    };

function stripQuery(segment: string): string {
  return segment.split("?")[0] ?? segment;
}

/** Parse flat console URLs from the `x-pathname` request header. */
export function parsePageLoadingRoute(
  pathname: string,
): ParsedPageLoadingRoute | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const [orgSlug, second, third, fourth, fifth] = parts;

  if (second === "p" && third && orgSlug) {
    return {
      kind: "page",
      orgSlug,
      teamspaceSlug: DEFAULT_TEAMSPACE_SLUG,
      pageId: stripQuery(third),
    };
  }

  if (second === "n" && third && fourth === "p" && fifth && orgSlug) {
    return {
      kind: "node-page",
      orgSlug,
      teamspaceSlug: DEFAULT_TEAMSPACE_SLUG,
      nodeId: third,
      pageId: stripQuery(fifth),
    };
  }

  if (fourth === "p" && fifth && orgSlug && second) {
    return {
      kind: "page",
      orgSlug,
      teamspaceSlug: second,
      pageId: stripQuery(fifth),
    };
  }

  return null;
}
