import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("SSOTA Console", () => {
  test("smoke: 로그인 → 프로젝트 Overview", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/overview$`));
    // Overview hub renders the graph CTA in both empty and seeded states.
    await expect(page.getByRole("button", { name: "Open Graph" })).toBeVisible();
  });

  test("smoke: Developer Setup route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "developer/setup");
    await expect(page.getByRole("heading", { name: "Developer Setup" })).toBeVisible();
    await expect(page.getByText("Connect MCP")).toBeVisible();
    await expect(page.getByText("X-SSOTA-Teamspace-Id").first()).toBeVisible();
  });

  test("smoke: Tasks route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
    await expect(page.getByText("Runtime work queue", { exact: false })).toBeVisible();
  });

  test("smoke: AppSidebar exposes v2.7 primary nav", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    const nav = page.getByRole("navigation", { name: "Primary" });
    const sidebar = page.locator("aside");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Chat", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Graph", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Channels", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Signed in as" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Workflows", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Workflow Map", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
  });

  test("smoke: profile menu opens in sidebar footer", async ({ page }) => {
    await loginAsSmoke(page);
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Signed in as" }).click();
    await expect(page.getByText("smoke@ssota.ai").last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByText("Language")).toBeVisible();
  });
});

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";

test.describe("SSOTA MCP HTTP", () => {
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
    expect(body.authorization_servers?.[0]).toMatch(/\/auth\/v1$/);
  });
});
