import { getPagePort } from "@/lib/ports";

export type AppPageLink = {
  pageId: string;
  label: string;
};

/** Top-level project pages for the end-user sidebar (excludes node drill-in templates). */
export async function listAppPageLinks(teamspaceId: string): Promise<AppPageLink[]> {
  const pages = await getPagePort(teamspaceId).listPages();

  return pages
    .filter((p) => !p.appliesToNodeType && !p.parentId)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      pageId: p.id,
      label: p.title.trim() || p.slug || p.id,
    }));
}
