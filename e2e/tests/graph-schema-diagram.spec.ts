import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Graph schema diagram", () => {
  test("renders node types clustered into workflow-phase group boxes", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "graph");

    await expect(page.getByRole("heading", { name: "Graph" })).toBeVisible();
    await expect(page.getByText("Schema diagram")).toBeVisible();

    const diagram = page.locator(".ssota-graph-schema");
    await expect(diagram).toBeVisible();

    // ELK layout is async — wait for the placeholder to clear before asserting on nodes.
    await expect(diagram.getByText("Laying out…")).toHaveCount(0, { timeout: 15_000 });

    // At least one group box (phase cluster) and one table card render as React Flow nodes.
    await expect(diagram.locator('[data-testid^="rf__node-group:"]').first()).toBeVisible();
    await expect(
      diagram.locator('[data-testid^="rf__node-"]:not([data-testid^="rf__node-group:"])').first(),
    ).toBeVisible();

    // The dev-workflow seed pack's node types resolve to at least the Executive phase group
    // (group label renders as "Executive· N", so match substring rather than exact text).
    await expect(diagram.getByText("Executive")).toBeVisible();

    await test.info().attach("schema-diagram-overview", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Zoom in on a group box so the PR record shows table cards + group border detail.
    await page.getByRole("button", { name: "Zoom In" }).click();
    await page.getByRole("button", { name: "Zoom In" }).click();
    await page.getByRole("button", { name: "Zoom In" }).click();
    await test.info().attach("schema-diagram-zoomed-group", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
