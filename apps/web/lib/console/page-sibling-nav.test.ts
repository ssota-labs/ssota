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
  };
}

describe("loadPageSiblingNav", () => {
  it("returns null for root pages", async () => {
    const port = {
      listChildren: vi.fn(),
    } as unknown as PagePort;

    const result = await loadPageSiblingNav(
      port,
      page("roadmap", "Roadmap", null),
      (id) => `/p/${id}`,
    );

    expect(result).toBeNull();
  });

  it("builds sibling tab row for nested pages", async () => {
    const roadmap = page("roadmap", "Roadmap", "exec", 0);
    const goals = page("goals", "Goals", "exec", 1);

    const port = {
      listChildren: vi.fn(async (parentId: string | null) => {
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
      items: [
        { id: "roadmap", title: "Roadmap", href: "/p/roadmap" },
        { id: "goals", title: "Goals", href: "/p/goals" },
      ],
      activeId: "roadmap",
    });
  });

  it("returns null when there is only one sibling", async () => {
    const roadmap = page("roadmap", "Roadmap", "exec");

    const port = {
      listChildren: vi.fn(async (parentId: string | null) => {
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
