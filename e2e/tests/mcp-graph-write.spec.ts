import { test, expect } from "@playwright/test";
import {
  DEFAULT_MCP_ORG_SLUG,
  DEFAULT_MCP_PROJECT_SLUG,
  getDefaultProjectId,
  getSmokeAccessToken,
  mcpToolCall,
  mcpToolCallExpectError,
} from "../helpers/mcp";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

const scope = {
  orgSlug: DEFAULT_MCP_ORG_SLUG,
  projectSlug: DEFAULT_MCP_PROJECT_SLUG,
};

test.describe("MCP graph write tools", () => {
  test("create_node, update_node, and create_edge", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const suffix = Date.now();

    const created = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "create_node",
      {
        nodeType: "hypothesis",
        title: `E2E MCP hypothesis ${suffix}`,
        properties: { status: "draft", summary: "MCP graph write test" },
      },
      scope,
    )) as { id: string; title: string; nodeType: string; content: string | null };
    expect(created.id).toBeTruthy();
    expect(created.nodeType).toBe("hypothesis");
    expect(created.content).toBeNull();

    const updated = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "update_node",
      {
        nodeId: created.id,
        content: "# E2E document\n\nWritten via MCP update_node.",
      },
      scope,
    )) as { id: string; content: string };
    expect(updated.id).toBe(created.id);
    expect(updated.content).toContain("Written via MCP update_node");

    const initiativeId = await getSmokeInitiativeId();
    const edge = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "create_edge",
      {
        edgeType: "informs",
        sourceNodeId: created.id,
        targetNodeId: initiativeId,
      },
      scope,
    )) as { id: string; edgeType: string; sourceNodeId: string; targetNodeId: string };
    expect(edge.edgeType).toBe("informs");
    expect(edge.sourceNodeId).toBe(created.id);
    expect(edge.targetNodeId).toBe(initiativeId);
  });

  test("rejects cross-project edge with PROJECT_MISMATCH", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const projectId = await getDefaultProjectId();
    const initiativeId = await getSmokeInitiativeId();
    const suffix = Date.now();

    const otherProjectId = "00000000-0000-4000-8000-00000000e2e0";
    const postgres = (await import("postgres")).default;
    const sql = postgres(
      process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      { max: 1 },
    );

    let foreignNodeId: string;
    try {
      await sql`
        insert into organizations (id, slug, name)
        values (${otherProjectId}, 'e2e-other-org', 'E2E Other Org')
        on conflict (id) do nothing
      `;
      await sql`
        insert into projects (id, organization_id, slug, name)
        values (${otherProjectId}, ${otherProjectId}, 'e2e-other-project', 'E2E Other Project')
        on conflict (id) do nothing
      `;
      const rows = await sql<{ id: string }[]>`
        insert into nodes (project_id, node_type, title, properties, lifecycle_status)
        values (${otherProjectId}, 'release', ${`E2E foreign release ${suffix}`}, '{}'::jsonb, 'Draft')
        returning id
      `;
      foreignNodeId = rows[0]!.id;
    } finally {
      await sql.end({ timeout: 1 });
    }

    const localNode = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "create_node",
      {
        nodeType: "hypothesis",
        title: `E2E cross-project source ${suffix}`,
        properties: { status: "draft" },
      },
      scope,
    )) as { id: string };

    const errorText = await mcpToolCallExpectError(
      request,
      mcpUrl,
      token,
      "create_edge",
      {
        edgeType: "paired_with",
        sourceNodeId: localNode.id,
        targetNodeId: foreignNodeId,
      },
      scope,
    );
    expect(errorText).toContain("PROJECT_MISMATCH");

    expect(projectId).toBeTruthy();
    expect(initiativeId).toBeTruthy();
  });
});
