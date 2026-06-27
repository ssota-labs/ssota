import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  seedDomainCatalog,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

let skip = false;

/**
 * Phase 2 FTS verification against a live local Postgres. Seeds a fresh project
 * (so catalog rows carry description/keywords) and exercises searchCatalog —
 * the generated tsvector column, ts_rank ordering, and the ILIKE fallback.
 */
describe("catalog search integration (FTS)", () => {
  let teamspaceId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let ports: ReturnType<typeof createGraphPorts>;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const [project] = await dbBundle.db
        .insert(schema.teamspaces)
        .values({
          organizationId: org.id,
          slug: `catalog-search-${randomUUID().slice(0, 8)}`,
          name: "Catalog Search Test",
        })
        .returning();
      teamspaceId = project!.id;
      await seedDomainCatalog(dbBundle.db, org.id);
      ports = createGraphPorts(dbBundle.db, {
        organizationId: org.id,
        teamspaceId,
      });
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("ranks an exact english key first", async () => {
    const hits = await ports.catalog.searchCatalog({
      query: "retrospective",
      limit: 10,
    });
    expect(hits[0]?.key).toBe("retrospective");
    expect(hits[0]?.kind).toBe("node");
    expect(hits[0]?.snippet.length).toBeGreaterThan(0);
  });

  it("matches korean label/keyword tokens", async () => {
    const hits = await ports.catalog.searchCatalog({ query: "회고", limit: 10 });
    expect(hits.map((h) => h.key)).toContain("retrospective");
  });

  it("matches via keyword aliases (metric → kpi)", async () => {
    const hits = await ports.catalog.searchCatalog({
      query: "metric",
      limit: 10,
    });
    expect(hits.map((h) => h.key)).toContain("kpi");
  });

  it("falls back to ILIKE for non-tokenizing prefixes (retro → retrospective)", async () => {
    const hits = await ports.catalog.searchCatalog({ query: "retro", limit: 10 });
    expect(hits.map((h) => h.key)).toContain("retrospective");
  });

  it("respects the kind filter", async () => {
    const edgeHits = await ports.catalog.searchCatalog({
      query: "page",
      kind: "edge",
      limit: 20,
    });
    expect(edgeHits.every((h) => h.kind === "edge")).toBe(true);
    expect(edgeHits.map((h) => h.key)).toContain("for_page");
  });

  it("returns nothing for a nonsense query", async () => {
    const hits = await ports.catalog.searchCatalog({
      query: "zzzznotareal",
      limit: 10,
    });
    expect(hits).toEqual([]);
  });

  it("honours the limit", async () => {
    const hits = await ports.catalog.searchCatalog({
      query: "design",
      limit: 1,
    });
    expect(hits.length).toBeLessThanOrEqual(1);
  });
});
