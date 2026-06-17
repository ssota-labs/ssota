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
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible();
    await editorSurface(page);
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
});
