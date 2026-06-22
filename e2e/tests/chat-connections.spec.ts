import { test, expect, type Page } from "@playwright/test";
import { createDb } from "@ssota/adapter-supabase";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

// e2e for the two new console surfaces. Vercel Connect is stubbed
// (CONNECT_STUB=1) and the LLM is stubbed (STUB_MODEL=1) so the real route /
// workflow / streaming pipeline runs locally without external services.

const CHAT_PLACEHOLDER = /메시지를 입력하세요/;

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

function chatComposer(page: Page) {
  return page.getByRole("textbox", { name: CHAT_PLACEHOLDER });
}

async function gotoChat(page: Page) {
  await gotoProject(page, "chat");
  await expect(chatComposer(page)).toBeVisible();
}

async function sendChatMessage(page: Page, text: string) {
  const input = chatComposer(page);
  await input.fill(text);
  await page.getByRole("button", { name: "전송" }).click();
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

  test.describe("chat UX", () => {
    test("empty state and composer chrome render on load", async ({ page }) => {
      await gotoChat(page);

      await expect(
        page.getByText("메시지를 보내 대화를 시작하세요"),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "새 채팅" })).toBeVisible();
      await expect(page.getByRole("button", { name: "이미지 첨부" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Claude Sonnet 4.6" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "전송" })).toBeDisabled();
    });

    test("send button enables when text is entered", async ({ page }) => {
      await gotoChat(page);

      const send = page.getByRole("button", { name: "전송" });
      await expect(send).toBeDisabled();

      await chatComposer(page).fill("hello");
      await expect(send).toBeEnabled();
    });

    test("model selector switches the active model", async ({ page }) => {
      await gotoChat(page);

      await page.getByRole("button", { name: "Claude Sonnet 4.6" }).click();
      await page.getByRole("menuitem", { name: "GPT-5.1" }).click();

      await expect(
        page.getByRole("button", { name: "GPT-5.1" }),
      ).toBeVisible();
    });

    test("@mention dropdown lists connector candidates", async ({ page }) => {
      await gotoChat(page);

      await chatComposer(page).fill("@Sl");
      await expect(page.getByRole("button", { name: /Slack/ })).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByText("↑↓ 이동 · Tab/Enter 선택 · Esc 닫기"),
      ).toBeVisible();
    });

    test("new chat creates a fresh thread with empty state", async ({ page }) => {
      await gotoChat(page);
      await sendChatMessage(page, "first thread message");
      await expect(page.getByText("first thread message")).toBeVisible();

      await page.getByRole("button", { name: "새 채팅" }).click();
      await expect(page).toHaveURL(/\/chat\?thread=/);
      await expect(
        page.getByText("메시지를 보내 대화를 시작하세요"),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("sends a message and streams the agent reply", async ({ page }) => {
      await gotoChat(page);
      await sendChatMessage(page, "ping from e2e");

      // User turn echoed, then the stubbed agent reply streams in via the full
      // route → workflow → stream → useChat → streamdown pipeline.
      await expect(page.getByText("ping from e2e")).toBeVisible();
      await expect(
        page.getByTestId("assistant-message").getByText(/stub agent/i),
      ).toBeVisible({ timeout: 30_000 });
    });
  });
});
