import { test, expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";
import { getSmokeAccessToken, mcpToolCall } from "../helpers/mcp";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("LoopOS define_node_type vertical slice", () => {
  test("Agent MCP propose → Human gate approve → catalog visible", async ({
    page,
    request,
  }) => {
    const nodeType = `E2EType_${Date.now()}`;
    let token: string;

    try {
      token = await getSmokeAccessToken();
    } catch {
      test.skip(true, "Supabase smoke auth unavailable");
      return;
    }

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

    await page.goto("/login");
    await page.getByPlaceholder("email").fill(SMOKE_EMAIL);
    await page.getByPlaceholder("password").fill(SMOKE_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByRole("heading", { name: "LoopOS Console" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("navigation").getByRole("link", { name: "Human Gate" }).click();
    await expect(page.getByText("define_node_type")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "승인" }).first().click();

    await page.getByRole("navigation").getByRole("link", { name: "Studio" }).click();
    await page.getByRole("link", { name: "Node Types" }).click();
    await expect(page.getByText(nodeType)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("navigation").getByRole("link", { name: "Action Log" }).click();
    await expect(page.getByText("define_node_type")).toBeVisible();
    await expect(page.getByText("approve_gate")).toBeVisible();
  });

  test("Human web form define_node_type committed", async ({ page }) => {
    const nodeType = `WebType_${Date.now()}`;

    await page.goto("/login");
    await page.getByPlaceholder("email").fill(SMOKE_EMAIL);
    await page.getByPlaceholder("password").fill(SMOKE_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByRole("heading", { name: "LoopOS Console" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/studio/node-types/new");
    await page.getByLabel("Node Type").fill(nodeType);
    await page.getByLabel("Archetype").selectOption("doc-note");
    await page.getByLabel("Content Guide").fill("Web form test");
    await page.getByRole("button", { name: "define_node_type 실행" }).click();

    await expect(page.getByText("committed")).toBeVisible({ timeout: 10_000 });

    await page.goto("/studio/node-types");
    await expect(page.getByText(nodeType)).toBeVisible();
  });
});
