import type { Page } from "@ssota/contracts";
import { describe, expect, it, vi } from "vitest";
import type { PagePort } from "@ssota/core";
import { loadPageSiblingNav } from "./page-sibling-nav";

function page(
  id: string,
  title: string,
  parentId: string | null,
  position = 0,
): Page {
  return {
    id,
    teamspaceId: "ts-1",
    slug: id,
    title,
    parentId,
    position,
    spec: { root: "root", elements: { root: { type: "Stack", props: {} } } },
    bindings: {},
    actions: {},
    subjectNodeId: null,
    appliesToNodeType: null,
    icon: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function hubPage(id: string, title: string, parentId: string | null): Page {
  return {
    ...page(id, title, parentId),
    spec: {
      root: "header",
      elements: { header: { type: "PageHeader", props: { title } } },
    },
  };
}

describe("loadPageSiblingNav", () => {
  it("returns null for root pages", async () => {
    const port = {
      getPage: vi.fn(),
      listChildren: vi.fn(),
    } as unknown as PagePort;

    const result = await loadPageSiblingNav(
      port,
      page("roadmap", "Roadmap", null),
      (id) => `/p/${id}`,
    );

    expect(result).toBeNull();
  });

  it("builds primary and secondary rows for nested pages", async () => {
    const executive = hubPage("exec", "Executive", null);
    const research = hubPage("research", "Research", null);
    const roadmap = page("roadmap", "Roadmap", "exec", 0);
    const goals = page("goals", "Goals", "exec", 1);

    const port = {
      getPage: vi.fn(async (id: string) => {
        if (id === "exec") return executive;
        return null;
      }),
      listChildren: vi.fn(async (parentId: string | null) => {
        if (parentId === null) return [executive, research];
        if (parentId === "exec") return [roadmap, goals];
        return [];
      }),
    } as unknown as PagePort;

    const result = await loadPageSiblingNav(
      port,
      roadmap,
      (id) => `/p/${id}`,
    );

    expect(result).toEqual({
      primary: [
        { id: "exec", title: "Executive", href: "/p/roadmap" },
        { id: "research", title: "Research", href: "/p/research" },
      ],
      activePrimaryId: "exec",
      secondary: [
        { id: "roadmap", title: "Roadmap", href: "/p/roadmap" },
        { id: "goals", title: "Goals", href: "/p/goals" },
      ],
      activeSecondaryId: "roadmap",
    });
  });

  it("returns null when there is only one sibling", async () => {
    const executive = hubPage("exec", "Executive", null);
    const roadmap = page("roadmap", "Roadmap", "exec");

    const port = {
      getPage: vi.fn(async () => executive),
      listChildren: vi.fn(async (parentId: string | null) => {
        if (parentId === null) return [executive];
        if (parentId === "exec") return [roadmap];
        return [];
      }),
    } as unknown as PagePort;

    const result = await loadPageSiblingNav(
      port,
      roadmap,
      (id) => `/p/${id}`,
    );

    expect(result).toBeNull();
  });
});
