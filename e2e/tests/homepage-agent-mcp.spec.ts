import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("Homepage agent MCP + subject_id", () => {
  test("project → brief → section → links under subject", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const subjectId = `e2e_homepage_${Date.now()}`;

    const projectResult = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "create_homepage_project",
        input: { title: "E2E Homepage" },
      },
      { subjectId },
    )) as { status: string };
    expect(projectResult.status).toBe("committed");

    const briefResult = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "create_design_brief",
        input: {
          title: "E2E Brief",
          content: "B2B SaaS homepage, professional tone",
        },
      },
      { subjectId },
    )) as { status: string };
    expect(briefResult.status).toBe("committed");

    const sectionResult = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "create_page_section",
        input: {
          title: "Hero",
          properties: { section_key: "hero" },
        },
      },
      { subjectId },
    )) as { status: string };
    expect(sectionResult.status).toBe("committed");

    const projects = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_nodes",
      { nodeType: "HomepageProject", limit: 10 },
      { subjectId },
    )) as Array<{ id: string; properties: Record<string, unknown> }>;

    const briefs = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_nodes",
      { nodeType: "DesignBrief", limit: 10 },
      { subjectId },
    )) as Array<{ id: string }>;

    const sections = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "query_nodes",
      { nodeType: "PageSection", limit: 10 },
      { subjectId },
    )) as Array<{ id: string; properties: Record<string, unknown> }>;

    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(briefs.length).toBeGreaterThanOrEqual(1);
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections[0]?.properties.section_key).toBe("hero");

    const project = projects.find((p) => p.properties.title === "E2E Homepage")!;
    const brief = briefs[0]!;
    const section = sections.find((s) => s.properties.title === "Hero")!;

    const linkBrief = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "link_homepage_contains",
        input: {
          sourceNodeId: project.id,
          targetNodeId: brief.id,
        },
      },
      { subjectId },
    )) as { status: string };
    expect(linkBrief.status).toBe("committed");

    const linkSection = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "execute_action",
      {
        actionType: "link_homepage_contains",
        input: {
          sourceNodeId: project.id,
          targetNodeId: section.id,
        },
      },
      { subjectId },
    )) as { status: string };
    expect(linkSection.status).toBe("committed");

    const edges = (await mcpToolCall(
      request,
      mcpUrl,
      token,
      "traverse_edges",
      {
        nodeId: project.id,
        direction: "outgoing",
        edgeType: "homepage_contains",
      },
      { subjectId },
    )) as Array<{ targetNodeId: string }>;

    expect(edges.length).toBeGreaterThanOrEqual(2);
  });

  test("거부: subject 없이 create_homepage_project", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const result = (await mcpToolCall(request, mcpUrl, token, "execute_action", {
      actionType: "create_homepage_project",
      input: { title: "No subject" },
    })) as { status: string; code?: string };

    expect(result.status).toBe("rejected");
    expect(result.code).toBe("SUBJECT_REQUIRED");
  });
});
