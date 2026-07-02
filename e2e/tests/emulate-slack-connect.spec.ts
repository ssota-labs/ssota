import { test, expect } from "@playwright/test";
import { createDb } from "@ssota/adapter-postgres";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

async function resetConnections() {
  const { db, client } = createDb(
    process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  try {
    await db.execute("delete from account_connections" as never);
  } finally {
    await client.end();
  }
}

test.describe("emulate-slack", () => {
  test.beforeEach(async ({ page }) => {
    await resetConnections();
    await loginAsSmoke(page);
  });

  test("connections: slack OAuth via emulate records a workspace row", async ({
    page,
  }) => {
    await gotoProject(page, "connections");

    const slack = page.getByTestId("connector-slack");
    await expect(slack).toBeVisible();
    await expect(slack.getByTestId("connection-row")).toHaveCount(0);

    await page.getByTestId("connector-slack").click();
    await page.getByTestId("connect-user-slack").click();

    await page.waitForURL(/\/oauth\/v2\/authorize/, { timeout: 30_000 });

    await page.locator("button.user-btn").first().click();

    await expect(slack.getByTestId("connection-row")).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(slack.getByTestId("connection-row").first()).toContainText(
      /SSOTA Dev|Emulate|smoke|workspace/i,
    );
  });
});
