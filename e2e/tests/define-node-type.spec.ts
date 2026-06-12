import { test, expect } from "@playwright/test";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, expectCanvasNode, gotoProject } from "../helpers/console";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("LoopOS define_node_type vertical slice", () => {
  test("Agent MCP propose → Human gate approve → catalog visible", async ({
    page,
    request,
  }) => {
    const nodeType = `E2EType_${Date.now()}`;
    const token = await getSmokeAccessToken();

    const mcpResult = (await mcpToolCall(request, mcpUrl, token, "execute_action", {
      actionType: "define_node_type",
      input: {
        definition: {
          nodeType,
          family: "document",
          archetypeId: "doc-reference",
          typicalValueOverrides: {},
          lifecycleTransitions: {
            Draft: ["Active", "Archived"],
            Active: ["Archived", "Draft"],
            Archived: ["Active"],
            Deleted: [],
          },
          contentGuide: "E2E agent proposed node type",
        },
      },
    })) as { status: string; gateId?: string };

    expect(mcpResult.status).toBe("gated");
    expect(mcpResult.gateId).toBeTruthy();

    await loginAsSmoke(page);

    await gotoProject(page, "gates");
    const gateCard = page.locator(".rounded-lg, .rounded-md, [data-slot='card']").filter({ hasText: nodeType });
    await expect(page.getByText("define_node_type").first()).toBeVisible({
      timeout: 10_000,
    });
    await gateCard.getByRole("button", { name: "승인" }).first().click();

    await gotoProject(page, "graph/nodes");
    await expectCanvasNode(page, nodeType.replace(/_/g, " "));

    await gotoProject(page, "log");
    await expect(page.getByText("define_node_type").first()).toBeVisible();
    await expect(page.getByText("approve_gate").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/log`));
  });

  test("Human web form define_node_type committed", async ({ page }) => {
    const nodeType = `WebType_${Date.now()}`;

    await loginAsSmoke(page);

    await gotoProject(page, "graph/nodes");
    await page.getByRole("button", { name: "New node table" }).click();
    await expect(page.locator("#nodeType")).toBeVisible();
    await page.locator("#nodeType").fill(nodeType);
    await page.locator("#archetypeId").fill("doc-note");
    await page.locator("#contentGuide").fill("Web form test");
    const label = nodeType.replace(/_/g, " ");
    const submit = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Create node table" }).click();
    await submit;
    await gotoProject(page, "graph/nodes");
    await expectCanvasNode(page, label);
  });
});
