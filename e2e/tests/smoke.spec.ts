import { test, expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";

test.describe("LoopOS Console", () => {
  test("smoke: 로그인 → 홈 → 카탈로그", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("email").fill(SMOKE_EMAIL);
    await page.getByPlaceholder("password").fill(SMOKE_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByRole("heading", { name: "LoopOS Console" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("navigation").getByRole("link", { name: "Catalog" }).click();
    await expect(page.getByRole("heading", { name: "Catalog Browser" })).toBeVisible();
    await expect(page.getByText("Note", { exact: true }).first()).toBeVisible();
  });

  test("smoke: Action Log 페이지", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("email").fill(SMOKE_EMAIL);
    await page.getByPlaceholder("password").fill(SMOKE_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByRole("heading", { name: "LoopOS Console" })).toBeVisible({
      timeout: 15_000,
    });

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
