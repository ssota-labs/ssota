import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createPagePort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import {
  createPageForMcp,
  getPageComponentForMcp,
  listPageComponentsForMcp,
  listPagesForMcp,
  readPageForMcp,
} from "./page-services";

// DB-backed (pages table). Skips gracefully without DATABASE_URL / seeded org.
let skip = false;

describe("page-services (DB-backed)", () => {
  let db: ReturnType<typeof createDb>["db"];
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let teamspaceId: string;
  const createdPageIds: string[] = [];

  beforeAll(async () => {
    try {
      const bundle = createDb();
      db = bundle.db;
      client = bundle.client;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) return void (skip = true);
      const project = await consolePort.getTeamspaceBySlug(
        org.id,
        DEFAULT_TEAMSPACE_SLUG,
      );
      if (!project) return void (skip = true);
      teamspaceId = project.id;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    if (!skip && teamspaceId) {
      const port = createPagePort(db, { teamspaceId });
      for (const id of createdPageIds) await port.deletePage(id).catch(() => {});
    }
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("lists the page component catalog (progressive-disclosure manifest)", () => {
    const { components } = listPageComponentsForMcp();
    expect(components.length).toBeGreaterThan(10);
    expect(components.some((c) => c.key === "NodeTable")).toBe(true);
  });

  it("gets one component's detail, and reports unknown", () => {
    const nt = getPageComponentForMcp("NodeTable");
    expect(nt.found).toBe(true);
    const bad = getPageComponentForMcp("NotAComponent");
    expect(bad.found).toBe(false);
  });

  it("authors a page (spec + binding), reads it back, lists it", async () => {
    const created = await createPageForMcp(teamspaceId, {
      title: "AX Test — leave queue",
      spec: {
        root: "t",
        elements: {
          t: {
            type: "NodeTable",
            props: { binding: "rows", columns: [{ key: "title", header: "T" }] },
          },
        },
      },
      bindings: { rows: { kind: "query", catalogKey: "task" } },
    });
    createdPageIds.push(created.id);
    expect(created.title).toBe("AX Test — leave queue");

    const read = await readPageForMcp(teamspaceId, created.id);
    expect(read?.id).toBe(created.id);

    const pages = await listPagesForMcp(teamspaceId);
    expect(pages.some((p) => p.id === created.id)).toBe(true);
  });

  it("rejects an unknown component type", async () => {
    await expect(
      createPageForMcp(teamspaceId, {
        title: "bad",
        spec: { root: "r", elements: { r: { type: "NotAComponent", props: {} } } },
      }),
    ).rejects.toThrow(/Unknown component type/);
  });

  it("rejects a spec referencing an undefined binding", async () => {
    await expect(
      createPageForMcp(teamspaceId, {
        title: "bad2",
        spec: {
          root: "t",
          elements: {
            t: { type: "NodeTable", props: { binding: "missing", columns: [] } },
          },
        },
      }),
    ).rejects.toThrow();
  });
});
