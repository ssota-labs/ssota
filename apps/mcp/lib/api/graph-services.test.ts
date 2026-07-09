import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  createDbCatalogWritePort,
  registerTeamspaceOrganization,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import {
  createEdgeTypeForMcp,
  createNodeTypeForMcp,
  getNodeTypeForMcp,
  listEdgeTypesForMcp,
  listNodeTypesForMcp,
} from "./graph-services";

// DB-backed (catalog is org-scoped in the DB). Skips gracefully when there is
// no DATABASE_URL / seeded org (mirrors agent-services.test.ts).
let skip = false;
// Unique test keys so writes to the seeded org catalog are self-contained.
const TEST_NODE_KEY = "zzz_ax_test_employee";
const TEST_EDGE_KEY = "zzz_ax_test_reports_to";

describe("graph-services catalog (DB-backed)", () => {
  let db: ReturnType<typeof createDb>["db"];
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let teamspaceId: string;
  let organizationId: string;
  const createdCatalogIds: string[] = [];

  beforeAll(async () => {
    try {
      const bundle = createDb();
      db = bundle.db;
      client = bundle.client;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getTeamspaceBySlug(
        org.id,
        DEFAULT_TEAMSPACE_SLUG,
      );
      if (!project) {
        skip = true;
        return;
      }
      teamspaceId = project.id;
      organizationId = org.id;
      // getGraphPorts / getCatalogWritePort resolve the org from this cache.
      registerTeamspaceOrganization(teamspaceId, org.id);
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    // Clean up any catalog rows this test authored.
    if (!skip && organizationId && createdCatalogIds.length > 0) {
      const writePort = createDbCatalogWritePort(db, { organizationId });
      for (const id of createdCatalogIds) {
        await writePort.deleteEdgeCatalog(id).catch(() => {});
        await writePort.deleteNodeCatalog(id).catch(() => {});
      }
    }
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("lists node types from the org catalog (DB)", async () => {
    const types = await listNodeTypesForMcp(teamspaceId);
    expect(types.length).toBeGreaterThan(0);
    // Detail lookup resolves for a listed key.
    const first = types[0]!;
    const entry = await getNodeTypeForMcp(teamspaceId, first.catalogKey);
    expect(entry?.catalogKey).toBe(first.catalogKey);
    expect(entry?.label).toBeTruthy();
  });

  it("lists edge types from the org catalog (DB)", async () => {
    const types = await listEdgeTypesForMcp(teamspaceId);
    expect(Array.isArray(types)).toBe(true);
  });

  it("returns null for an unknown node type key", async () => {
    expect(
      await getNodeTypeForMcp(teamspaceId, "definitely_not_a_type_zzz"),
    ).toBeNull();
  });

  it("authors a node type, then reads it back", async () => {
    const created = await createNodeTypeForMcp(teamspaceId, {
      key: TEST_NODE_KEY,
      label: "AX Test Employee",
      description: "Throwaway type authored by graph-services test.",
      keywords: ["ax", "test"],
      propertySchema: { type: "object" },
    });
    createdCatalogIds.push(created.id);
    expect(created.key).toBe(TEST_NODE_KEY);

    const readBack = await getNodeTypeForMcp(teamspaceId, TEST_NODE_KEY);
    expect(readBack?.label).toBe("AX Test Employee");
  });

  it("authors an edge type constrained by existing node-type keys", async () => {
    // Depends on the node type authored above.
    const created = await createEdgeTypeForMcp(teamspaceId, {
      key: TEST_EDGE_KEY,
      label: "AX Test reports_to",
      domainKeys: [TEST_NODE_KEY],
      rangeKeys: [TEST_NODE_KEY],
    });
    createdCatalogIds.push(created.id);
    expect(created.key).toBe(TEST_EDGE_KEY);
    expect(created.domainCatalogIds.length).toBe(1);
  });

  it("rejects an edge type whose domain key does not exist", async () => {
    await expect(
      createEdgeTypeForMcp(teamspaceId, {
        key: "zzz_ax_test_bad_edge",
        label: "bad",
        domainKeys: ["definitely_not_a_type_zzz"],
      }),
    ).rejects.toThrow(/Unknown node type key/);
  });
});
