import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Editor Lab E2E — 사용자 피드백(버그·UX)마다 대응 테스트를 유지한다.
 * PR에는 피드백 항목 ↔ 테스트명(`pnpm e2e --grep '<키워드>'`)을 1:1로 적는다.
 */

async function editorSurface(page: Page): Promise<Locator> {
  const surface = page.getByTestId("ssota-editor-surface");
  await expect(surface).toBeVisible({ timeout: 15_000 });
  return surface;
}

async function focusEditorEnd(page: Page) {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate(() => {
    const editor = window.__ssotaEditorLab;
    editor?.chain().focus("end").insertContent({ type: "paragraph" }).focus("end").run();
  });
  return editorSurface(page);
}

async function typeAtDocumentEnd(page: Page, text: string) {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate((value) => {
    const editor = window.__ssotaEditorLab;
    editor
      ?.chain()
      .focus("end")
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: value }],
      })
      .focus("end")
      .run();
  }, text);
  return editorSurface(page);
}

async function openSlashMenu(page: Page, query = "") {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate((filter) => {
    const editor = window.__ssotaEditorLab;
    editor
      ?.chain()
      .focus("end")
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: `/${filter}` }],
      })
      .focus("end")
      .run();
  }, query);
  await expect(page.getByTestId("ssota-slash-menu")).toBeVisible({
    timeout: 10_000,
  });
  return editorSurface(page);
}

async function openEmojiMenu(page: Page, query = "") {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate((filter) => {
    const editor = window.__ssotaEditorLab;
    editor
      ?.chain()
      .focus("end")
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: `:${filter}` }],
      })
      .focus("end")
      .run();
  }, query);
  await expect(page.getByTestId("ssota-suggestion-menu")).toBeVisible({
    timeout: 10_000,
  });
}

async function insertCallout(page: Page) {
  await openSlashMenu(page);
  await page.getByRole("option", { name: /Callout/i }).click();
  const callout = page.locator(".ssota-callout").first();
  await expect(callout).toBeVisible();
  return callout;
}

test.describe("Editor Lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/editor-lab");
    await expect(page.getByTestId("editor-lab")).toBeVisible();
    await expect(page.getByTestId("ssota-editor-shell")).toBeVisible();
    await editorSurface(page);
  });

  test.describe("slash menu", () => {
    test("opens and inserts heading", async ({ page }) => {
      await openSlashMenu(page);
      await page.getByRole("option", { name: "Heading 1" }).click();

      await expect(page.locator(".ssota-editor h1").last()).toBeVisible();
      await expect(page.getByTestId("ssota-slash-menu")).toBeHidden();
    });

    test("navigates with arrow keys and Enter", async ({ page }) => {
      await openSlashMenu(page);
      const menu = page.getByTestId("ssota-slash-menu");

      await expect(menu.locator('[data-selected="true"]')).toContainText("Paragraph");

      await page.keyboard.press("ArrowDown");
      await expect(menu.locator('[data-selected="true"]')).toContainText("Heading 1");

      await page.keyboard.press("ArrowDown");
      await expect(menu.locator('[data-selected="true"]')).toContainText("Heading 2");

      await page.keyboard.press("Enter");
      await expect(page.locator(".ssota-editor h2").last()).toBeVisible();
      await expect(menu).toBeHidden();
    });

    test("wraps selection with ArrowUp", async ({ page }) => {
      await openSlashMenu(page);
      const menu = page.getByTestId("ssota-slash-menu");

      await expect(menu.locator('[data-selected="true"]')).toContainText("Paragraph");

      await page.keyboard.press("ArrowUp");
      await expect(menu.locator('[data-selected="true"]')).toContainText("Toggle");
    });
  });

  test.describe("callout", () => {
    test("inserts block with default info variant", async ({ page }) => {
      const callout = await insertCallout(page);
      await expect(callout).toHaveAttribute("data-variant", "info");
      await expect(callout.locator("select")).toHaveCount(0);
    });

    test("icon popover switches variant without select", async ({ page }) => {
      const callout = await insertCallout(page);
      const trigger = callout.getByTestId("ssota-callout-icon-trigger");

      await trigger.click();
      await page.getByRole("option", { name: "Warning" }).click();
      await expect(callout).toHaveAttribute("data-variant", "warning");
      await expect(callout.locator("select")).toHaveCount(0);

      await trigger.click();
      await page.getByRole("option", { name: "Tip" }).click();
      await expect(callout).toHaveAttribute("data-variant", "tip");
      await expect(callout.locator("select")).toHaveCount(0);
    });
  });

  test.describe("bubble toolbar", () => {
    test("appears on text selection", async ({ page }) => {
      const surface = await editorSurface(page);
      await surface.getByText("inline code").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await expect(toolbar).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Bold" })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Italic" })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Code" })).toBeVisible();
    });

    test("does not show text alignment controls", async ({ page }) => {
      const surface = await editorSurface(page);
      await surface.getByText("inline code").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await expect(toolbar).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Align left" })).toHaveCount(0);
      await expect(toolbar.getByRole("button", { name: "Align center" })).toHaveCount(0);
      await expect(toolbar.getByRole("button", { name: "Align right" })).toHaveCount(0);
    });

    test("applies bold and italic together", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "combo marks");
      await surface.getByText("combo marks").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await expect(toolbar).toBeVisible();
      await toolbar.getByRole("button", { name: "Bold" }).click();
      await toolbar.getByRole("button", { name: "Italic" }).click();

      await expect(surface.locator("strong em, em strong")).toBeVisible();
    });

    test("bold toggle on and off", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "togglebold");
      await surface.getByText("togglebold").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      const bold = toolbar.getByRole("button", { name: "Bold" });
      await expect(toolbar).toBeVisible();

      await bold.click();
      await expect(surface.locator("strong", { hasText: "togglebold" })).toBeVisible();
      await bold.click();
      await expect(surface.locator("strong", { hasText: "togglebold" })).toHaveCount(0);
    });

    test("code mark toggle", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "codemark");
      await surface.getByText("codemark").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      const code = toolbar.getByRole("button", { name: "Code" });
      await expect(toolbar).toBeVisible();

      await code.click();
      await expect(surface.locator("code", { hasText: "codemark" })).toBeVisible();
      await code.click();
      await expect(surface.locator("code", { hasText: "codemark" })).toHaveCount(0);
    });
  });

  test.describe("emoji menu", () => {
    test("opens on colon trigger", async ({ page }) => {
      await openEmojiMenu(page);
    });

    test("navigates with arrow keys and Enter", async ({ page }) => {
      await openEmojiMenu(page);
      const menu = page.getByTestId("ssota-suggestion-menu");
      const before = await page.locator(".ssota-emoji").count();

      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      await expect(page.locator(".ssota-emoji")).toHaveCount(before + 1);
      await expect(menu).toBeHidden();
    });
  });

  test.describe("drag handle", () => {
    test("is available on block hover", async ({ page }) => {
      const block = page.locator(".ssota-editor p").first();
      await block.hover();
      await expect(page.locator(".ssota-drag-handle")).toBeVisible({
        timeout: 5_000,
      });
    });

    test("menu duplicates block", async ({ page }) => {
      const blocks = page.locator(".ssota-editor p");
      const before = await blocks.count();

      const block = blocks.first();
      await block.hover();
      await page.locator(".ssota-drag-handle-trigger").click();
      await page.getByRole("menuitem", { name: "Duplicate" }).click();

      await expect(blocks).toHaveCount(before + 1);
    });

    test("reorders blocks", async ({ page }) => {
      const surface = await editorSurface(page);
      await page.evaluate(() => {
        const editor = window.__ssotaEditorLab;
        editor
          ?.chain()
          .focus("end")
          .insertContent([
            { type: "paragraph", content: [{ type: "text", text: "drag reorder first" }] },
            { type: "paragraph", content: [{ type: "text", text: "drag reorder second" }] },
          ])
          .run();
      });

      const firstBlock = surface.getByText("drag reorder first");
      const secondBlock = surface.getByText("drag reorder second");
      await expect(firstBlock).toBeVisible();
      await expect(secondBlock).toBeVisible();

      await secondBlock.hover();
      const handle = page.locator(".ssota-drag-handle");
      await expect(handle).toBeVisible();

      await handle.dragTo(firstBlock, {
        sourcePosition: { x: 8, y: 8 },
        targetPosition: { x: 8, y: 2 },
      });
      await page.waitForTimeout(400);

      const order = await surface.locator("p").evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? ""),
      );
      const secondIndex = order.findIndex((text) => text.includes("drag reorder second"));
      const firstIndex = order.findIndex((text) => text.includes("drag reorder first"));
      expect(secondIndex).toBeGreaterThanOrEqual(0);
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(secondIndex).toBeLessThan(firstIndex);
    });
  });

  test("editor JSON preview updates on change", async ({ page }) => {
    await typeAtDocumentEnd(page, "json sync");
    await expect(page.getByTestId("editor-lab-json")).toContainText("json sync");
  });
});
