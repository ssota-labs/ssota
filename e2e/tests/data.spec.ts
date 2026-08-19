import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

/**
 * Data 페이지 (ADR-aip-console-concepts D) — explorer(타입별 카운트) + 테이블 +
 * 액션 폼 + RecordView. 시드된 finance 도메인 팩을 대상으로 한다.
 */

test.describe("Data", () => {
  test.slow();

  test("explorer가 타입과 카운트를 보여준다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "data");
    const explorer = page.getByTestId("data-explorer");
    await expect(explorer).toBeVisible();
    // 라벨은 다른 도메인과 겹칠 수 있어 catalog key로 겨냥한다.
    await expect(explorer.locator('[data-catalog-key="finance.journal_entry"]')).toBeVisible();
    await expect(explorer.locator('[data-catalog-key="finance.account"]')).toBeVisible();
  });

  test("액션 폼으로 전표를 만들면 표와 RecordView에 나타난다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "data?type=finance.account");

    // 계정 2개를 먼저 확보한다 — 전표 액션의 uuid 파라미터 후보.
    const accountRows = page.getByTestId("data-row");
    const accountCount = await accountRows.count();
    test.skip(accountCount < 2, "계정 노드가 2개 이상 있어야 전표를 만들 수 있다");

    await page.getByTestId("data-explorer").locator('[data-catalog-key="finance.journal_entry"]').click();
    await expect(page).toHaveURL(/type=finance\.journal_entry/);

    const before = await page.getByTestId("data-row").count();

    await page.getByRole("button", { name: "전표 전기" }).click();
    const form = page.getByTestId("action-form");
    await expect(form).toBeVisible();

    const entryNo = `E2E-${Date.now().toString(36).slice(-6)}`;
    await form.getByLabel("entryNo *").fill(entryNo);
    await form.getByLabel("postedAt *").fill("2026-08-19");
    await form.getByLabel("amount *").fill("2500");
    // uuid 파라미터는 노드 선택기로 렌더되고, 액션 편집에서 유도한 타입(계정)만 담긴다.
    await form.getByLabel("debitAccountId *").selectOption({ label: "매출채권 · 계정과목" });
    await form.getByLabel("creditAccountId *").selectOption({ label: "매출 · 계정과목" });
    await form.getByRole("button", { name: "Run" }).click();

    await expect(form.getByRole("alert")).toContainText("Committed");

    // 시트를 닫으면 표가 갱신돼 있다.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("data-row")).toHaveCount(before + 1);
    const row = page.getByTestId("data-row").filter({ hasText: entryNo });
    await expect(row).toBeVisible();

    // RecordView — 분개행 2줄이 링크로 보인다.
    await row.click();
    const record = page.getByTestId("record-view");
    await expect(record).toBeVisible();
    await expect(record.getByText("Links (2)")).toBeVisible();
  });

  test("필수 파라미터를 비우면 액션이 실행되지 않는다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "data?type=finance.journal_entry");
    await page.getByRole("button", { name: "전표 전기" }).click();
    const form = page.getByTestId("action-form");
    await form.getByRole("button", { name: "Run" }).click();
    // HTML required가 먼저 막는다 — 폼은 그대로 열려 있고 커밋 메시지는 없다.
    await expect(form).toBeVisible();
    await expect(form.getByText("Committed")).toHaveCount(0);
  });
});
