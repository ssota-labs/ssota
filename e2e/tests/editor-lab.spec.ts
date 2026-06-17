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
  const surface = await editorSurface(page);
  await surface.click();
  await page.evaluate(() => {
    const editor = window.__ssotaEditorLab;
    if (!editor) return;
    editor.chain().focus("end").insertContent({ type: "paragraph" }).focus("end").run();
  });
  await page.waitForFunction(() => {
    const editor = window.__ssotaEditorLab;
    if (!editor) return false;
    const { $from } = editor.state.selection;
    return $from.parent.isTextblock;
  });
  return surface;
}

async function typeQuoteShortcut(page: Page) {
  await page.keyboard.type('"', { delay: 40 });
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

async function selectEditorText(page: Page, text: string) {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate((value) => {
    const editor = window.__ssotaEditorLab;
    if (!editor) return;

    let from = -1;
    let to = -1;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text?.includes(value)) return;
      const index = node.text.indexOf(value);
      from = pos + index;
      to = from + value.length;
      return false;
    });

    if (from >= 0) {
      editor.chain().focus().setTextSelection({ from, to }).run();
    }
  }, text);
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

/** 현재 블록 내용을 `/query`로 바꿔 슬래시 메뉴를 연다 (중첩 리스트 등 커서 위치 유지) */
async function openSlashMenuInCurrentBlock(page: Page, query: string) {
  await page.waitForFunction(() => Boolean(window.__ssotaEditorLab));
  await page.evaluate((filter) => {
    const editor = window.__ssotaEditorLab;
    if (!editor) return;

    const { $from } = editor.state.selection;
    const blockStart = $from.start();
    const blockEnd = $from.end();

    editor
      .chain()
      .focus()
      .setTextSelection({ from: blockStart, to: blockEnd })
      .insertContent(`/${filter}`)
      .run();
  }, query);
  await expect(page.getByTestId("ssota-slash-menu")).toBeVisible({
    timeout: 10_000,
  });
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

    test("does not open when slash is typed mid-line", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "hello world");
      await surface.getByText("hello world").click();
      await page.keyboard.type(" /head", { delay: 20 });

      await expect(page.getByTestId("ssota-slash-menu")).toBeHidden();
      await expect(surface.getByText("hello world /head")).toBeVisible();
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

    test("filters items when typing after slash", async ({ page }) => {
      await openSlashMenu(page);
      const menu = page.getByTestId("ssota-slash-menu");

      await expect(menu.getByRole("option", { name: /Paragraph/i })).toBeVisible();
      await page.keyboard.type("head", { delay: 30 });

      await expect(menu).toBeVisible();
      await expect(menu.getByRole("option", { name: /Heading 1/i })).toBeVisible();
      await expect(menu.getByRole("option", { name: /Paragraph/i })).toBeHidden();
      await expect(menu.locator('[data-selected="true"]')).toContainText("Heading 1");
    });

    test("opens with filtered query", async ({ page }) => {
      await openSlashMenu(page, "head");
      const menu = page.getByTestId("ssota-slash-menu");

      await expect(menu.getByRole("option", { name: /Heading 1/i })).toBeVisible();
      await expect(menu.getByRole("option", { name: /Paragraph/i })).toBeHidden();
      await expect(menu.locator('[data-selected="true"]')).toContainText("Heading 1");
    });

    test("keeps keyboard selection scrolled into view", async ({ page }) => {
      await openSlashMenu(page);
      const menu = page.getByTestId("ssota-slash-menu");

      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("ArrowDown");
      }

      const isVisible = await menu.evaluate((el) => {
        const list = el.querySelector('[data-slot="command-list"]');
        const selected = el.querySelector(
          '[data-slot="command-item"][data-selected="true"]',
        );
        if (!(list instanceof HTMLElement) || !(selected instanceof HTMLElement)) {
          return false;
        }
        const listRect = list.getBoundingClientRect();
        const itemRect = selected.getBoundingClientRect();
        return itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom;
      });

      expect(isVisible).toBe(true);
    });
  });

  test.describe("callout", () => {
    test("inserts block with default info variant", async ({ page }) => {
      const callout = await insertCallout(page);
      await expect(callout).toHaveAttribute("data-variant", "info");
      await expect(callout.locator("select")).toHaveCount(0);
    });

    test("shows Notion-style title field", async ({ page }) => {
      const callout = await insertCallout(page);
      const title = callout.locator("[data-callout-title]");

      await expect(title).toBeVisible();
      await expect(title).toHaveAttribute("data-placeholder", "제목");
    });

    test("accepts title and body with Enter between them", async ({ page }) => {
      const callout = await insertCallout(page);

      await page.keyboard.type("Important note");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Supporting details");

      await expect(callout.locator("[data-callout-title]")).toContainText(
        "Important note",
      );
      await expect(callout.getByText("Supporting details")).toBeVisible();
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

  test.describe("quote shortcut", () => {
    test('creates blockquote when typing " at line start', async ({ page }) => {
      const surface = await focusEditorEnd(page);

      await typeQuoteShortcut(page);
      const quote = surface.locator("blockquote").last();
      await expect(quote).toBeVisible();
      await expect(quote).not.toContainText('"');
    });

    test("typed quote content stays inside blockquote", async ({ page }) => {
      const surface = await focusEditorEnd(page);

      await typeQuoteShortcut(page);
      const quote = surface.locator("blockquote").last();
      await expect(quote).toBeVisible();

      await page.keyboard.type("Quoted text");
      await expect(quote).toContainText("Quoted text");
    });

    test('creates blockquote after Enter on sample document', async ({ page }) => {
      const surface = await editorSurface(page);
      await surface.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await typeQuoteShortcut(page);

      const quote = surface.locator("blockquote").last();
      await expect(quote).toBeVisible();
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

    test("shows tooltips on toolbar buttons", async ({ page }) => {
      const surface = await editorSurface(page);
      await surface.getByText("inline code").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await expect(toolbar).toBeVisible();

      for (const label of [
        "Bold",
        "Italic",
        "Strike",
        "Code",
        "Link",
        "텍스트색",
        "배경색",
      ]) {
        await toolbar.getByRole("button", { name: label }).hover();
        await expect(
          page.locator('[data-slot="tooltip-content"]').filter({ hasText: label }),
        ).toBeVisible();
      }
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

    test("applies text and background colors from popovers", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "color sample");
      await selectEditorText(page, "color sample");

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await toolbar.getByRole("button", { name: "텍스트색" }).click();
      const textPopover = page.getByTestId("ssota-text-color-popover");
      await expect(textPopover).toBeVisible();
      await textPopover.getByRole("option", { name: "파랑" }).click();

      await expect(
        surface.locator('span[style*="color"]', { hasText: "color sample" }),
      ).toBeVisible();

      await selectEditorText(page, "color sample");
      await toolbar.getByRole("button", { name: "배경색" }).click();
      const backgroundPopover = page.getByTestId("ssota-background-color-popover");
      await expect(backgroundPopover).toBeVisible();
      await backgroundPopover.getByRole("option", { name: "노랑" }).click();

      await expect(surface.locator("mark", { hasText: "color sample" })).toBeVisible();
    });

    test("removes text and background colors from popovers", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "clear colors");
      await selectEditorText(page, "clear colors");

      const toolbar = page.getByTestId("ssota-bubble-toolbar");

      await toolbar.getByRole("button", { name: "텍스트색" }).click();
      await page
        .getByTestId("ssota-text-color-popover")
        .getByRole("option", { name: "빨강" })
        .click();
      await expect(surface.locator('span[style*="color"]')).toHaveCount(1);

      await selectEditorText(page, "clear colors");
      await toolbar.getByRole("button", { name: "텍스트색" }).click();
      await page
        .getByTestId("ssota-text-color-popover")
        .getByRole("option", { name: "기본" })
        .click();
      await expect(surface.locator('span[style*="color"]')).toHaveCount(0);

      await selectEditorText(page, "clear colors");
      await toolbar.getByRole("button", { name: "배경색" }).click();
      await page
        .getByTestId("ssota-background-color-popover")
        .getByRole("option", { name: "초록" })
        .click();
      await expect(surface.locator("mark")).toHaveCount(1);

      await selectEditorText(page, "clear colors");
      await toolbar.getByRole("button", { name: "배경색" }).click();
      await page
        .getByTestId("ssota-background-color-popover")
        .getByRole("option", { name: "없음" })
        .click();
      await expect(surface.locator("mark")).toHaveCount(0);
    });

    test("opens link popover to set url and title", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "link me");
      await surface.getByText("link me").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await toolbar.getByRole("button", { name: "Link" }).click();

      const popover = page.getByTestId("ssota-link-popover");
      await expect(popover).toBeVisible();
      await expect(popover.getByLabel("제목")).toHaveValue("link me");

      await popover.getByLabel("제목").fill("SSOTA");
      await popover.getByLabel("링크").fill("https://ssota.dev");
      await popover.getByRole("button", { name: "적용" }).click();

      await expect(popover).toHaveCount(0);
      await expect(
        surface.locator('a[href="https://ssota.dev"]', { hasText: "SSOTA" }),
      ).toBeVisible();
    });

    test("edits existing link via popover", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "edit link");
      await surface.getByText("edit link").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await toolbar.getByRole("button", { name: "Link" }).click();

      const popover = page.getByTestId("ssota-link-popover");
      await popover.getByLabel("링크").fill("https://example.com");
      await popover.getByRole("button", { name: "적용" }).click();

      const link = surface.locator('a[href="https://example.com"]', {
        hasText: "edit link",
      });
      await expect(link).toBeVisible();

      await link.click({ clickCount: 3 });
      await expect(toolbar).toBeVisible();
      await toolbar.getByRole("button", { name: "Link" }).click();
      const editPopover = page.getByTestId("ssota-link-popover");
      await expect(editPopover).toBeVisible();

      await editPopover.getByLabel("제목").fill("Updated label");
      await editPopover.getByLabel("링크").fill("https://updated.dev");
      await editPopover.getByRole("button", { name: "적용" }).click();

      await expect(
        surface.locator('a[href="https://updated.dev"]', { hasText: "Updated label" }),
      ).toBeVisible();
    });

    test("removes link via popover", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "remove link");
      await surface.getByText("remove link").click({ clickCount: 3 });

      const toolbar = page.getByTestId("ssota-bubble-toolbar");
      await toolbar.getByRole("button", { name: "Link" }).click();

      const popover = page.getByTestId("ssota-link-popover");
      await popover.getByLabel("링크").fill("https://remove.dev");
      await popover.getByRole("button", { name: "적용" }).click();

      const link = surface.locator('a[href="https://remove.dev"]', {
        hasText: "remove link",
      });
      await expect(link).toBeVisible();

      await link.click({ clickCount: 3 });
      await expect(toolbar).toBeVisible();
      await toolbar.getByRole("button", { name: "Link" }).click();
      const removePopover = page.getByTestId("ssota-link-popover");
      await expect(removePopover).toBeVisible();
      await removePopover.getByRole("button", { name: "링크 제거" }).click();

      await expect(surface.locator('a[href="https://remove.dev"]')).toHaveCount(0);
      await expect(surface.getByText("remove link")).toBeVisible();
    });
  });

  test.describe("mixed list nesting", () => {
    async function hasMixedListNesting(page: Page): Promise<boolean> {
      return page.evaluate(() => {
        const doc = window.__ssotaEditorLab?.getJSON();
        if (!doc) return false;

        let mixed = false;
        const isList = (type?: string) =>
          type === "bulletList" || type === "orderedList";

        const visit = (
          node: { type?: string; content?: unknown[] },
          enclosingList?: string,
        ) => {
          if (mixed || !node) return;

          if (isList(node.type)) {
            if (enclosingList && enclosingList !== node.type) {
              mixed = true;
              return;
            }

            const listType = node.type;
            for (const listItem of node.content ?? []) {
              for (const child of (listItem as { content?: unknown[] }).content ??
                []) {
                visit(
                  child as { type?: string; content?: unknown[] },
                  listType,
                );
              }
            }
            return;
          }

          for (const child of node.content ?? []) {
            visit(child as { type?: string; content?: unknown[] }, enclosingList);
          }
        };

        visit(doc);
        return mixed;
      });
    }

    test("nests bullet list inside numbered list", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "parent");
      await page.evaluate(() => {
        window.__ssotaEditorLab?.chain().focus().toggleList("orderedList", "listItem").run();
      });

      await page.keyboard.press("Enter");
      await page.keyboard.type("child");
      await surface.getByText("child").click();

      await openSlashMenuInCurrentBlock(page, "bullet");
      await page.getByRole("option", { name: "Bullet list" }).click();

      await expect(surface.locator("ol li ul")).toBeVisible();
      expect(await hasMixedListNesting(page)).toBe(true);
    });

    test("nests numbered list inside bullet list", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "parent");
      await page.evaluate(() => {
        window.__ssotaEditorLab?.chain().focus().toggleList("bulletList", "listItem").run();
      });

      await page.keyboard.press("Enter");
      await page.keyboard.type("child");
      await surface.getByText("child").click();

      await openSlashMenuInCurrentBlock(page, "number");
      await page.getByRole("option", { name: "Numbered list" }).click();

      await expect(surface.locator("ul li ol")).toBeVisible();
      expect(await hasMixedListNesting(page)).toBe(true);
    });

    test("indents nested list with Tab", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "one");
      await page.evaluate(() => {
        window.__ssotaEditorLab?.chain().focus().toggleList("bulletList", "listItem").run();
      });

      await page.keyboard.press("Enter");
      await page.keyboard.type("two");
      await page.keyboard.press("Tab");

      await expect(surface.locator("ul ul")).toBeVisible();
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
      const handle = page.locator(".ssota-drag-grip");
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

    test("does not show bubble toolbar while dragging block handle", async ({ page }) => {
      const surface = await typeAtDocumentEnd(page, "drag bubble guard");
      await surface.getByText("drag bubble guard").hover();

      const grip = page.locator(".ssota-drag-grip");
      await expect(grip).toBeVisible();

      const box = await grip.boundingBox();
      if (!box) throw new Error("drag grip not positioned");

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(120);

      await expect(page.getByTestId("ssota-bubble-toolbar")).toBeHidden();
      await page.mouse.up();
    });
  });

  test("editor JSON preview updates on change", async ({ page }) => {
    await typeAtDocumentEnd(page, "json sync");
    await expect(page.getByTestId("editor-lab-json")).toContainText("json sync");
  });
});
