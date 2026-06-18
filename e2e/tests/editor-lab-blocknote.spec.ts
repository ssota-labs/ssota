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

  test("highlights slash menu item on arrow key navigation", async ({ page }) => {
    const surface = await focusEditorEnd(page);
    await surface.press("Enter");
    await page.keyboard.type("/", { delay: 40 });

    const menu = page.locator("#bn-suggestion-menu");
    await expect(menu).toBeVisible();

    const items = menu.locator("[role='option']");
    await expect(items.first()).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(items.first()).not.toHaveAttribute("aria-selected", "true");

    const highlight = await page.evaluate(() => {
      const menuEl = document.querySelector("#bn-suggestion-menu");
      const selected = menuEl?.querySelector('[role="option"][aria-selected="true"]');
      if (!menuEl || !selected) {
        return null;
      }

      return {
        menuBg: getComputedStyle(menuEl).backgroundColor,
        selectedBg: getComputedStyle(selected).backgroundColor,
      };
    });

    expect(highlight).not.toBeNull();
    expect(highlight!.selectedBg).not.toBe(highlight!.menuBg);
  });

  test("opens formatting toolbar on text selection", async ({ page }) => {
    await page.locator(".bn-editor").getByText("굵게").dblclick();
    const toolbar = page.locator(".bn-formatting-toolbar");
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "진하게" })).toBeVisible();
    await expect(toolbar.locator('[data-test="text-color"]')).toBeVisible();
    await expect(toolbar.locator('[data-test="background-color"]')).toBeVisible();
  });

  test("opens separate text and background color menus", async ({ page }) => {
    await page.locator(".bn-editor").getByText("굵게").dblclick();
    const toolbar = page.locator(".bn-formatting-toolbar");
    await expect(toolbar).toBeVisible();

    await toolbar.locator('[data-test="text-color"]').click();
    const textMenu = page.locator('.bn-color-picker-dropdown [data-test="text-color-red"]');
    await expect(textMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator(".bn-editor").getByText("굵게").dblclick();

    await toolbar.locator('[data-test="background-color"]').click();
    const backgroundMenu = page.locator(
      '.bn-color-picker-dropdown [data-test="background-color-blue"]',
    );
    await expect(backgroundMenu).toBeVisible();
  });

  test("color menu icon and label do not overlap when selected", async ({ page }) => {
    await page.locator(".bn-editor").getByText("굵게").dblclick();
    await page.locator('[data-test="text-color"]').click();

    const selectedItem = page.locator(
      '.bn-color-picker-dropdown [data-test="text-color-default"]',
    );
    await expect(selectedItem).toBeVisible();

    const overlap = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll(
          '.bn-color-picker-dropdown [data-test^="text-color-"]',
        ),
      ];

      return items.map((item) => {
        const icon = item.querySelector(".bn-color-icon");
        const label = item.querySelector(".ssota-bn-color-menu-label");
        if (!icon || !label) {
          return { test: item.getAttribute("data-test"), error: "missing icon or label" };
        }

        const iconBox = icon.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();

        return {
          test: item.getAttribute("data-test"),
          horizontalOverlap: iconBox.right > labelBox.left,
          gap: labelBox.left - iconBox.right,
        };
      });
    });

    expect(overlap.every((item) => !("error" in item))).toBe(true);
    expect(overlap.every((item) => !item.horizontalOverlap && item.gap > 0)).toBe(
      true,
    );
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

  test("formats numbered markers under bullet parent as 1/a/i cycle", async ({
    page,
  }) => {
    await page.waitForFunction(() => Boolean(window.__ssotaBlockNoteLab));
    await page.evaluate(() => {
      const editor = window.__ssotaBlockNoteLab;
      if (!editor) {
        throw new Error("BlockNote editor is not ready");
      }
      editor.replaceBlocks(editor.document, [
        {
          type: "bulletListItem",
          content: "ddd",
          children: [
            {
              type: "numberedListItem",
              content: "dd",
              children: [
                {
                  type: "numberedListItem",
                  content: "dd",
                  children: [
                    {
                      type: "numberedListItem",
                      content: "목록",
                    },
                  ],
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
      return items.length === 3;
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

  test("keeps toggle heading placeholder inline when expanded", async ({ page }) => {
    await page.waitForFunction(() => Boolean(window.__ssotaBlockNoteLab));
    await page.evaluate(() => {
      const editor = window.__ssotaBlockNoteLab;
      if (!editor) {
        throw new Error("BlockNote editor is not ready");
      }
      editor.replaceBlocks(editor.document, [
        {
          type: "heading",
          props: { level: 1, isToggleable: true },
          content: "",
          children: [],
        },
      ]);
      const block = editor.document[0];
      if (!block) {
        throw new Error("toggle heading block was not created");
      }
      editor.focus();
      editor.setTextCursorPosition(block.id, "end");
    });

    const toggleButton = page.locator(".blocknote-editor-shell .bn-toggle-button").first();
    await toggleButton.click();
    await expect(
      page.locator(".blocknote-editor-shell .bn-toggle-add-block-button"),
    ).toBeVisible();

    const placeholderTarget = await page.evaluate(() => {
      const blockContent = document.querySelector(
        ".blocknote-editor-shell .bn-block-content[data-content-type='heading']:has(.bn-toggle-wrapper)",
      );
      const heading = blockContent?.querySelector("h1");
      if (!blockContent || !heading) {
        return { error: "toggle heading not found" };
      }

      const blockAfter = getComputedStyle(blockContent, "::after").content;
      const headingAfter = getComputedStyle(heading, "::after").content;

      return { blockAfter, headingAfter };
    });

    expect(placeholderTarget).not.toHaveProperty("error");
    expect(placeholderTarget.blockAfter === "none" || placeholderTarget.blockAfter === '""').toBe(
      true,
    );
    expect(placeholderTarget.headingAfter).toContain("제목");
  });

  test("keeps toggle heading title inline and focuses correctly when typing", async ({
    page,
  }) => {
    await page.waitForFunction(() => Boolean(window.__ssotaBlockNoteLab));
    await page.evaluate(() => {
      const editor = window.__ssotaBlockNoteLab;
      if (!editor) {
        throw new Error("BlockNote editor is not ready");
      }
      editor.replaceBlocks(editor.document, [
        {
          type: "heading",
          props: { level: 1, isToggleable: true },
          content: "",
          children: [{ type: "paragraph", content: "child block" }],
        },
      ]);
      const block = editor.document[0];
      if (!block) {
        throw new Error("toggle heading block was not created");
      }
      editor.focus();
      editor.setTextCursorPosition(block.id, "end");
    });

    await page.locator(".blocknote-editor-shell .bn-toggle-button").first().click();
    await page.locator(".blocknote-editor-shell .bn-toggle-wrapper h1").click();

    const layout = await page.evaluate(() => {
      const heading = document.querySelector(".blocknote-editor-shell .bn-toggle-wrapper h1");
      if (!heading) {
        return { error: "toggle heading not found" };
      }

      const headingRect = heading.getBoundingClientRect();
      const after = getComputedStyle(heading, "::after");

      return {
        headingHeight: headingRect.height,
        headingScrollWidth: heading.scrollWidth,
        placeholder: after.content,
        placeholderWhiteSpace: after.whiteSpace,
      };
    });

    expect(layout).not.toHaveProperty("error");
    expect(layout.headingHeight).toBeLessThan(80);
    expect(layout.headingScrollWidth).toBeGreaterThan(40);
    expect(layout.placeholder).toContain("제목");
    expect(layout.placeholderWhiteSpace).toBe("nowrap");

    await page.keyboard.type("ㅇㅇ");

    await expect(page.locator(".blocknote-editor-shell .bn-toggle-wrapper h1")).toContainText(
      "ㅇㅇ",
    );
    await expect(page.getByTestId("editor-lab-blocknote-json")).toContainText("ㅇㅇ");
  });
});
