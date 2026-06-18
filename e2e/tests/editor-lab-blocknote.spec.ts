import { test, expect, type Page } from "@playwright/test";

async function editorSurface(page: Page) {
  const surface = page.locator(".bn-editor").first();
  await expect(surface).toBeVisible({ timeout: 15_000 });
  return surface;
}

async function focusEditorEnd(page: Page) {
  await page.waitForFunction(() => Boolean(window.__ssotaBlockNoteLab));
  const surface = await editorSurface(page);
  await surface.click();
  await page.evaluate(() => {
    const editor = window.__ssotaBlockNoteLab;
    if (!editor) return;
    const lastBlock = editor.document[editor.document.length - 1];
    if (!lastBlock) return;
    editor.focus();
    editor.setTextCursorPosition(lastBlock.id, "end");
  });
  return surface;
}

test.describe("Editor Lab BlockNote", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/editor-lab-blocknote");
    await expect(page.getByTestId("editor-lab-blocknote")).toBeVisible();
    await expect(page.locator(".blocknote-editor-shell .bn-editor")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("loads editor and shows sample JSON", async ({ page }) => {
    await expect(page.getByTestId("editor-lab-blocknote-json")).toContainText(
      "SSOTA BlockNote PoC",
    );
    await expect(page.locator(".bn-editor h1")).toContainText("SSOTA BlockNote PoC");
  });

  test("syncs typed text to JSON preview", async ({ page }) => {
    const unique = `blocknote-json-sync-${Date.now()}`;
    const surface = await focusEditorEnd(page);
    await surface.press("Enter");
    await page.keyboard.type(unique, { delay: 20 });

    await expect(page.getByTestId("editor-lab-blocknote-json")).toContainText(unique);
  });

  test("opens slash menu", async ({ page }) => {
    const surface = await focusEditorEnd(page);
    await surface.press("Enter");
    await page.keyboard.type("/", { delay: 40 });

    await expect(page.locator("#bn-suggestion-menu")).toBeVisible();
    await expect(page.locator("#bn-suggestion-menu")).toContainText("제목1");
  });

  test("opens formatting toolbar on text selection", async ({ page }) => {
    await page.locator(".bn-editor").getByText("굵게").dblclick();
    const toolbar = page.locator(".bn-formatting-toolbar");
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "진하게" })).toBeVisible();
  });

  test("formats nested numbered list markers as a/i/1 cycle", async ({ page }) => {
    await page.waitForFunction(() => Boolean(window.__ssotaBlockNoteLab));
    await page.evaluate(() => {
      const editor = window.__ssotaBlockNoteLab;
      if (!editor) {
        throw new Error("BlockNote editor is not ready");
      }
      editor.replaceBlocks(editor.document, [
        {
          type: "numberedListItem",
          content: "outer",
          children: [
            {
              type: "numberedListItem",
              content: "nested-alpha",
              children: [
                {
                  type: "numberedListItem",
                  content: "nested-roman",
                },
              ],
            },
          ],
        },
      ]);
    });

    await page.waitForFunction(() => {
      const items = document.querySelectorAll(
        ".blocknote-editor-shell [data-content-type='numberedListItem']",
      );
      return items.length === 3 && items[0]?.hasAttribute("data-index");
    });

    const markers = await page.evaluate(() => {
      window.__ssotaBlockNoteLabRefreshMarkers?.();
      return [
        ...document.querySelectorAll(
          ".blocknote-editor-shell [data-content-type='numberedListItem']",
        ),
      ].map((item) => item.getAttribute("data-marker"));
    });

    expect(markers).toEqual(["1.", "a.", "i."]);
  });
});
