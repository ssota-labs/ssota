import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";

test.describe("LoopOS Console", () => {
  test("smoke: 로그인 → 홈 → 카탈로그", async ({ page }) => {
    await loginAsSmoke(page);
    await page.getByRole("navigation").getByRole("link", { name: "Catalog" }).click();
    await expect(page.getByRole("heading", { name: "Catalog Browser" })).toBeVisible();
    await expect(page.getByText("Note", { exact: true }).first()).toBeVisible();
  });

  test("smoke: Context Graph 페이지", async ({ page }) => {
    await loginAsSmoke(page);
    await page.getByRole("navigation").getByRole("link", { name: "Context Graph" }).click();
    await expect(page.getByRole("heading", { name: "Context Graph" })).toBeVisible();
    await page.getByRole("link", { name: "Nodes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nodes" })).toBeVisible();
    await expect(page.getByText("Note")).toBeVisible();
  });

  test("smoke: Studio 페이지", async ({ page }) => {
    await loginAsSmoke(page);
    await page.getByRole("navigation").getByRole("link", { name: "Studio" }).click();
    await expect(page.getByRole("heading", { name: "Meta Action Studio" })).toBeVisible();
    await page.getByRole("link", { name: "Node Types", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Node Types" })).toBeVisible();
  });

  test("smoke: Action Log 페이지", async ({ page }) => {
    await loginAsSmoke(page);
    await page.getByRole("navigation").getByRole("link", { name: "Action Log" }).click();
    await expect(page.getByRole("heading", { name: "Action Log" })).toBeVisible();
  });
});

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("LoopOS MCP HTTP", () => {
  test("smoke: Bearer 없이 401", async ({ request }) => {
    const res = await request.post(`${mcpUrl}/api/mcp`, {
      data: { jsonrpc: "2.0", method: "initialize", id: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("smoke: protected resource metadata", async ({ request }) => {
    const res = await request.get(
      `${mcpUrl}/.well-known/oauth-protected-resource`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.resource).toContain("/api/mcp");
  });
});
