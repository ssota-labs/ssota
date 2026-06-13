import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("SSOTA Console", () => {
  test("smoke: 로그인 → 프로젝트 홈", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}$`));
    await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible();
  });

  test("smoke: Graph → node table", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph/nodes?table=document");
    await expect(page.getByText("Choose a graph object", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Document" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Table" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Schema" })).toBeVisible();
    await expect(page.getByPlaceholder("Filter rows...")).toBeVisible();
  });

  test("smoke: Homepage Agent vertical catalog", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph/verticals/homepage-agent");
    await expect(page.getByRole("heading", { name: "Homepage Agent" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "HomepageProject" }),
    ).toBeVisible();
    await expect(page.getByText("create_node").first()).toBeVisible();
    await expect(page.getByText("Homepage creation workflow")).toBeVisible();
  });

  test("smoke: Workflows route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "instructions");
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
  });

  test("smoke: Runs route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "log");
    await expect(page.getByRole("heading", { name: "Runs" })).toBeVisible();
  });

  test("smoke: Impact Queue route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "impact");
    await expect(page.getByRole("heading", { name: "Impact Queue" })).toBeVisible();
  });

  test("smoke: icon rail exposes primary nav", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Graph", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Impact", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Runs", exact: true })).toBeVisible();
  });

  test("smoke: project selector preserves current route", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph/nodes?table=document");
    await expect(page.getByPlaceholder("Filter rows...")).toBeVisible();

    await page.getByRole("button", { name: "SSOTA Dev" }).click();
    await page.getByRole("menuitem", { name: "SSOTA Dev" }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/graph/nodes\\?table=document`),
    );
    await expect(page.getByPlaceholder("Filter rows...")).toBeVisible();
  });

  test("smoke: profile menu opens", async ({ page }) => {
    await loginAsSmoke(page);
    await page.getByRole("button", { name: "Signed in as" }).click();
    await expect(page.getByText("smoke@ssota.test")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });

  test("smoke: legacy /context-graph redirect", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto("/context-graph/nodes/Document");
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/graph/nodes\\?table=document`),
    );
    await expect(page.getByPlaceholder("Filter rows...")).toBeVisible();
  });

  test("smoke: /studio redirect", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto("/studio/node-types");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/graph/nodes`));
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
