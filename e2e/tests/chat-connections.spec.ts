import { test, expect } from "@playwright/test";
import { createDb } from "@ssota/adapter-postgres";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

// e2e for the two new console surfaces. Vercel Connect is stubbed
// (CONNECT_STUB=1) and the LLM is stubbed (STUB_MODEL=1) so the real route /
// workflow / streaming pipeline runs locally without external services.

async function resetChatAndConnections() {
  const { db, client } = createDb(
    process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  try {
    await db.execute("delete from account_connections" as never);
    await db.execute("delete from chat_messages" as never);
    await db.execute("delete from chat_threads" as never);
  } finally {
    await client.end();
  }
}

test.describe("Connections + Chat", () => {
  test.beforeEach(async ({ page }) => {
    await resetChatAndConnections();
    await loginAsSmoke(page);
  });

  test("connections: multi-workspace connector records multiple installs", async ({
    page,
  }) => {
    await gotoProject(page, "connections");

    const slack = page.getByTestId("connector-slack");
    await expect(slack).toBeVisible();
    await expect(slack.getByText("multiple workspaces")).toBeVisible();
    await expect(slack.getByTestId("connection-row")).toHaveCount(0);

    // First connect → /api/connect/authorize → (stub) callback → records → back.
    await page.getByTestId("connect-slack").click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(1);

    // Add a second workspace → second row (multi-install end to end).
    await page.getByTestId("connect-slack").click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(2);

    // Disconnect one → back to a single row.
    await slack
      .getByTestId("connection-row")
      .first()
      .getByRole("button", { name: "Disconnect" })
      .click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(1);
  });

  test("connections: single-workspace connector (Linear) has no add-workspace", async ({
    page,
  }) => {
    await gotoProject(page, "connections");

    const linear = page.getByTestId("connector-linear");
    await expect(linear).toBeVisible();
    await expect(linear.getByText("multiple workspaces")).toHaveCount(0);

    await page.getByTestId("connect-linear").click();
    await expect(linear.getByTestId("connection-row")).toHaveCount(1);
    // Single connectors offer Reconnect, never "Add workspace".
    await expect(linear.getByTestId("reconnect-linear")).toBeVisible();
    await expect(linear.getByText("Add workspace")).toHaveCount(0);
  });

  test("chat: sends a message and streams the agent reply", async ({ page }) => {
    await gotoProject(page, "chat");

    const input = page.getByPlaceholder("Send a message…");
    await expect(input).toBeVisible();
    await input.fill("ping from e2e");
    await page.getByRole("button", { name: "Send" }).click();

    // User turn echoed, then the stubbed agent reply streams in via the full
    // route → workflow → stream → useChat → streamdown pipeline.
    await expect(page.getByText("ping from e2e")).toBeVisible();
    await expect(
      page.getByTestId("assistant-message").getByText(/stub agent/i),
    ).toBeVisible({ timeout: 30_000 });
  });
});
