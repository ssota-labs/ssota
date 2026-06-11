import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("LoopOS Console", () => {
  test("smoke: 로그인 → 프로젝트 홈", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}$`));
    await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible();
  });

  test("smoke: Graph → Nodes", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph");
    await expect(page.getByRole("heading", { name: "Graph" })).toBeVisible();
    await page.getByRole("link", { name: /Nodes \d+/ }).click();
    await expect(page.getByRole("heading", { name: "Nodes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Document" })).toBeVisible();
  });

  test("smoke: Homepage Agent vertical catalog", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph/verticals/homepage-agent");
    await expect(page.getByRole("heading", { name: "Homepage Agent" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "HomepageProject" }),
    ).toBeVisible();
    await expect(page.getByText("create_homepage_project").first()).toBeVisible();
    await expect(page.getByText("Homepage creation workflow")).toBeVisible();
  });

  test("smoke: Instructions route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "instructions");
    await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
  });

  test("smoke: Action Log route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "log");
    await expect(page.getByRole("heading", { name: "Action Log" })).toBeVisible();
  });

  test("smoke: sidebar exposes primary nav", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page.getByRole("link", { name: "Graph", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Action Log", exact: true })).toBeVisible();
  });

  test("smoke: legacy /context-graph redirect", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto("/context-graph/nodes/Document");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/graph/nodes/document`),
    );
    await expect(page.getByRole("heading", { name: "Document" })).toBeVisible();
  });

  test("smoke: /studio redirect", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto("/studio/node-types");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/graph/nodes`));
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
