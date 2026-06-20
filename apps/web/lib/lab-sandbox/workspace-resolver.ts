import type { WorkspaceDefinition, WorkspaceNavEntry } from "@ssota/contracts";
import type { LabSandboxState, MockPage, MockWorkspaceSeed } from "./types";

export function resolveWorkspaceNav(
  seed: MockWorkspaceSeed,
  pages: MockPage[],
): WorkspaceDefinition {
  const pageIdByKey = new Map(pages.map((p) => [p.pageKey, p.id]));

  const mapEntry = (entry: MockWorkspaceSeed["nav"][number]): WorkspaceNavEntry | null => {
    if (entry.type === "separator") {
      return { type: "separator" };
    }
    if (entry.type === "link") {
      const pageNodeId = pageIdByKey.get(entry.pageKey);
      if (!pageNodeId) return null;
      return {
        type: "link",
        key: entry.key,
        label: entry.label,
        pageNodeId,
      };
    }
    if (entry.type === "section") {
      const children = entry.children
        .map((child) => {
          const pageNodeId = pageIdByKey.get(child.pageKey);
          if (!pageNodeId) return null;
          return {
            type: "link" as const,
            key: child.key,
            label: child.label,
            pageNodeId,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      if (children.length === 0) return null;
      return {
        type: "section",
        key: entry.key,
        label: entry.label,
        children,
      };
    }
    return null;
  };

  return {
    nav: seed.nav
      .map(mapEntry)
      .filter((e): e is WorkspaceNavEntry => e !== null),
  };
}

export function findPageById(state: LabSandboxState, pageNodeId: string): MockPage | null {
  return state.pages.find((p) => p.id === pageNodeId) ?? null;
}

export function findPageByKey(state: LabSandboxState, pageKey: string): MockPage | null {
  return state.pages.find((p) => p.pageKey === pageKey) ?? null;
}
