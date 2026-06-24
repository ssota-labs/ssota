import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb } from "@ssota/adapter-postgres";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

const STUB_CONNECTION_SEARCH_TRIGGER = "e2e-connection-search";

// e2e for the two new console surfaces. Vercel Connect is stubbed
// (CONNECT_STUB=1) and the LLM is stubbed (STUB_MODEL=1) so the real route /
// workflow / streaming pipeline runs locally without external services.

const CHAT_PLACEHOLDER = /메시지를 입력하세요/;
const FIXTURE_IMAGE = join(process.cwd(), "fixtures/chat-test-image.png");
const FIXTURE_BYTES = [...readFileSync(FIXTURE_IMAGE)];

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
  await gotoProject(page, "c");
  await expect(chatComposer(page)).toBeVisible();
}

async function sendChatMessage(page: Page, text: string) {
  const input = chatComposer(page);
  await input.fill(text);
  await page.getByRole("button", { name: "전송" }).click();
}

function chatComposerForm(page: Page) {
  return page.locator("form").filter({ has: chatComposer(page) });
}

async function waitForAttachmentReady(page: Page) {
  const preview = page.getByTestId("attachment-preview");
  await expect(preview.locator("img")).toBeVisible({ timeout: 15_000 });
  await expect(preview.locator(".animate-spin")).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function attachImageViaFilePicker(page: Page) {
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(FIXTURE_IMAGE);
  await waitForAttachmentReady(page);
}

async function attachImageViaPaste(page: Page) {
  const input = chatComposer(page);
  await input.focus();
  await input.evaluate((el, bytes) => {
    const dt = new DataTransfer();
    const file = new File(
      [new Uint8Array(bytes)],
      "paste.png",
      { type: "image/png" },
    );
    dt.items.add(file);
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      }),
    );
  }, FIXTURE_BYTES);
  await waitForAttachmentReady(page);
}

async function attachImageViaDragDrop(page: Page) {
  const form = chatComposerForm(page);
  await form.evaluate((formEl, bytes) => {
    const dt = new DataTransfer();
    const file = new File(
      [new Uint8Array(bytes)],
      "drop.png",
      { type: "image/png" },
    );
    dt.items.add(file);
    formEl.dispatchEvent(
      new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
    );
  }, FIXTURE_BYTES);
  await waitForAttachmentReady(page);
}

async function sendWithReadyAttachment(page: Page, text?: string) {
  if (text) {
    await chatComposer(page).fill(text);
  }
  await expect(page.getByRole("button", { name: "전송" })).toBeEnabled({
    timeout: 10_000,
  });
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
    await expect(slack.getByText(/multiple workspaces|여러 워크스페이스/i)).toBeVisible();
    await expect(slack.getByTestId("connection-row")).toHaveCount(0);

    // First connect → /api/connect/authorize → (stub) callback → records → back.
    await page.getByTestId("connect-slack").click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(1);

    // Add a second workspace → second row (multi-install end to end).
    await page.getByTestId("connect-slack").click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(2);

    // Each connected workspace row offers per-installation Reconnect.
    await expect(slack.getByTestId("reconnect-slack")).toHaveCount(2);

    // Disconnect one → back to a single row.
    await slack
      .getByTestId("connection-row")
      .first()
      .getByRole("button", { name: /Disconnect|연결 해제/i })
      .click();
    await page.getByTestId("disconnect-dialog-confirm").click();
    await expect(slack.getByTestId("connection-row")).toHaveCount(1);
  });

  test("connections: single-workspace connector (Linear) has no add-workspace", async ({
    page,
  }) => {
    await gotoProject(page, "connections");

    const linear = page.getByTestId("connector-linear");
    await expect(linear).toBeVisible();
    await expect(linear.getByText(/multiple workspaces|여러 워크스페이스/i)).toHaveCount(0);

    await page.getByTestId("connect-linear").click();
    await expect(linear.getByTestId("connection-row")).toHaveCount(1);
    // Single connectors offer per-row Reconnect, never "Add workspace".
    await expect(
      linear.getByTestId("connection-row").getByTestId("reconnect-linear"),
    ).toBeVisible();
    await expect(linear.getByText(/Add workspace|워크스페이스 추가/i)).toHaveCount(0);
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

    test("composer clears fully after Enter send with trailing IME composition", async ({
      page,
    }) => {
      await gotoChat(page);
      const input = chatComposer(page);
      await input.fill("~~~해줘");
      await input.press("Enter");
      await expect(page.getByText("~~~해줘")).toBeVisible();
      await expect(input).toHaveValue("");

      // Late compositionend can re-inject the last jamo after a controlled clear.
      await input.evaluate((el) => {
        const textarea = el as HTMLTextAreaElement;
        textarea.dispatchEvent(
          new CompositionEvent("compositionstart", { bubbles: true }),
        );
        textarea.dispatchEvent(
          new CompositionEvent("compositionend", { bubbles: true, data: "줘" }),
        );
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(textarea, "줘");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });

      await expect(input).toHaveValue("");
    });

    test("model selector switches the active model", async ({ page }) => {
      await gotoChat(page);

      await page.getByRole("button", { name: "Claude Sonnet 4.6" }).click();
      await page.getByRole("menuitem", { name: "GPT-5.1" }).click();

      await expect(
        page.getByRole("button", { name: "GPT-5.1" }),
      ).toBeVisible();
    });

    test("@mention dropdown sections connectors, graph nodes, and edges", async ({
      page,
    }) => {
      await gotoChat(page);

      // Connectors — section header + Slack row.
      await chatComposer(page).pressSequentially("@Sl", { delay: 50 });
      const dropdown = page.getByTestId("mention-dropdown");
      await expect(dropdown).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("mention-section-connector")).toBeVisible();
      await expect(dropdown.getByRole("button", { name: /Slack/ })).toBeVisible();
      await expect(
        page.getByText("↑↓ 이동 · Tab/Enter 선택 · Esc 닫기"),
      ).toBeVisible();

      await page.screenshot({
        path: "/opt/cursor/artifacts/screenshots/chat-mention-dropdown-connectors.png",
        fullPage: true,
      });

      // Graph nodes — seeded "Smoke initiative" title.
      await chatComposer(page).fill("");
      await chatComposer(page).pressSequentially("@Smoke", { delay: 50 });
      await expect(dropdown).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("mention-section-node")).toBeVisible();
      await expect(
        dropdown.getByTestId("mention-option-node").filter({
          hasText: /^Smoke initiative/,
        }),
      ).toBeVisible();

      await page.screenshot({
        path: "/opt/cursor/artifacts/screenshots/chat-mention-dropdown-nodes.png",
        fullPage: true,
      });

      // Edges — seeded paired_with "Smoke initiative → v0.0.0-smoke".
      await chatComposer(page).fill("");
      await chatComposer(page).pressSequentially("@v0.0.0-smoke", { delay: 50 });
      await expect(dropdown).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("mention-section-edge")).toBeVisible();
      await expect(
        dropdown.getByTestId("mention-option-edge").filter({
          hasText: /Smoke initiative → v0\.0\.0-smoke/,
        }),
      ).toBeVisible();
      await expect(
        dropdown.getByTestId("mention-option-edge").filter({
          hasText: /1:1 쌍/,
        }),
      ).toBeVisible();

      await page.screenshot({
        path: "/opt/cursor/artifacts/screenshots/chat-mention-dropdown-edges.png",
        fullPage: true,
      });
    });

    test("image attachment via file picker uploads to storage", async ({
      page,
    }) => {
      await gotoChat(page);
      await attachImageViaFilePicker(page);
      await page.screenshot({
        path: "/opt/cursor/artifacts/screenshots/chat-image-attachment-preview.png",
        fullPage: true,
      });
      await sendWithReadyAttachment(page, "image via file picker");

      await expect(page.getByText("image via file picker")).toBeVisible();
      await expect(page.getByTestId("user-message-image")).toBeVisible({
        timeout: 15_000,
      });
      await page.screenshot({
        path: "/opt/cursor/artifacts/screenshots/chat-image-sent-message.png",
        fullPage: true,
      });
    });

    test("image attachment via clipboard paste uploads to storage", async ({
      page,
    }) => {
      await gotoChat(page);
      await attachImageViaPaste(page);
      await sendWithReadyAttachment(page, "image via paste");

      await expect(page.getByText("image via paste")).toBeVisible();
      await expect(page.getByTestId("user-message-image")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("image attachment via drag-and-drop uploads to storage", async ({
      page,
    }) => {
      await gotoChat(page);
      await attachImageViaDragDrop(page);
      await sendWithReadyAttachment(page, "image via drag drop");

      await expect(page.getByText("image via drag drop")).toBeVisible();
      await expect(page.getByTestId("user-message-image")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("new chat creates a fresh thread with empty state", async ({ page }) => {
      await gotoChat(page);
      await sendChatMessage(page, "first thread message");
      await expect(page.getByText("first thread message")).toBeVisible();

      await page.getByRole("button", { name: "새 채팅" }).click();
      await expect(page).toHaveURL(/\/c\/[0-9a-f-]{36}$/);
      await expect(
        page.getByText("메시지를 보내 대화를 시작하세요"),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("new chat button optimistically adds sidebar item before navigation", async ({
      page,
    }) => {
      await gotoChat(page);

      const sidebar = page
        .locator("aside")
        .filter({ has: page.getByRole("button", { name: "새 채팅" }) });
      const countBefore = await sidebar.locator(".group").count();

      let releaseCreate: () => void = () => {};
      const createGate = new Promise<void>((resolve) => {
        releaseCreate = resolve;
      });

      await page.route("**/*", async (route) => {
        const request = route.request();
        if (
          request.method() === "POST" &&
          request.headers()["next-action"]
        ) {
          await createGate;
        }
        await route.continue();
      });

      const urlBefore = page.url();
      await page.getByRole("button", { name: "새 채팅" }).click();

      await expect(sidebar.locator(".group")).toHaveCount(countBefore + 1, {
        timeout: 2_000,
      });
      await expect(page).toHaveURL(urlBefore);

      releaseCreate();
      await expect(page).toHaveURL(/\/c\/[0-9a-f-]{36}$/, { timeout: 10_000 });
      await expect(
        page.getByText("메시지를 보내 대화를 시작하세요"),
      ).toBeVisible();
    });

    test("delete chat removes thread from sidebar", async ({ page }) => {
      await gotoChat(page);
      await sendChatMessage(page, "thread to delete");
      await expect(page.getByText("thread to delete")).toBeVisible();

      const threadId = page.url().match(/\/c\/([0-9a-f-]{36})/)?.[1];
      expect(threadId).toBeTruthy();

      const threadRow = page
        .locator("aside")
        .filter({ has: page.getByRole("button", { name: "새 채팅" }) })
        .locator(".group")
        .filter({ hasText: /New chat/i })
        .first();
      await expect(threadRow).toBeVisible();
      await threadRow.hover();
      await threadRow.getByRole("button", { name: "채팅 삭제" }).click();
      await threadRow.getByRole("button", { name: "삭제 확인" }).click();

      await expect(page).toHaveURL(/\/c\/(new|[0-9a-f-]{36})/);
      await expect(page.getByText("thread to delete")).toHaveCount(0);
      await expect(
        page.locator(`aside a[href$="/c/${threadId}"]`),
      ).toHaveCount(0);

      await page.reload();
      await expect(
        page.locator(`aside a[href$="/c/${threadId}"]`),
      ).toHaveCount(0);
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
      await expect(page.getByRole("button", { name: "중지" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "전송" })).toBeVisible();
    });

    test("connection_search then connection_call via stub model", async ({
      page,
    }) => {
      await gotoProject(page, "connections");
      await page.getByTestId("connect-linear").click();
      await expect(
        page.getByTestId("connector-linear").getByTestId("connection-row"),
      ).toHaveCount(1);

      await gotoChat(page);
      await sendChatMessage(
        page,
        `${STUB_CONNECTION_SEARCH_TRIGGER} find linear issues`,
      );

      await expect(
        page.getByText(`${STUB_CONNECTION_SEARCH_TRIGGER} find linear issues`),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("assistant-message")
          .getByText(/connection_search.*stub MCP/i),
      ).toBeVisible({ timeout: 60_000 });
    });

    test("assistant reply persists after page refresh", async ({ page }) => {
      await gotoChat(page);
      await sendChatMessage(page, "ping from e2e refresh");

      await expect(page.getByText("ping from e2e refresh")).toBeVisible();
      await expect(
        page.getByTestId("assistant-message").getByText(/stub agent/i),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("button", { name: "전송" })).toBeVisible();

      await page.reload();
      await expect(chatComposer(page)).toBeVisible();
      await expect(page.getByText("ping from e2e refresh")).toBeVisible();
      await expect(
        page.getByTestId("assistant-message").getByText(/stub agent/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    test("tool activity persists after page refresh", async ({ page }) => {
      await gotoProject(page, "connections");
      await page.getByTestId("connect-linear").click();
      await expect(
        page.getByTestId("connector-linear").getByTestId("connection-row"),
      ).toHaveCount(1);

      await gotoChat(page);
      await sendChatMessage(
        page,
        `${STUB_CONNECTION_SEARCH_TRIGGER} find linear issues`,
      );

      await expect(
        page.getByTestId("tool-activity-connection_search"),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole("button", { name: "전송" })).toBeVisible({
        timeout: 60_000,
      });

      await page.reload();
      await expect(chatComposer(page)).toBeVisible();
      await expect(
        page.getByTestId("tool-activity-connection_search"),
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
