import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("landing: renders hero with July launch badge and beta signup", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("main.dark")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("7월 중 오픈 예정")).toBeVisible();
    await expect(page.getByLabel("SSOTA prompt preview")).toBeVisible();
    await expect(
      page
        .locator("section")
        .first()
        .getByRole("button", { name: "베타 알림 받기" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "부담 없이 시작하세요" }),
    ).toBeVisible();
    await expect(page.getByText("Cloud Starter", { exact: true })).toBeVisible();
    await expect(
      page.locator("#pricing").getByText("Enterprise", { exact: true }),
    ).toBeVisible();
  });

  test("landing: beta signup dialog saves email", async ({ page }) => {
    await page.goto("/");

    const uniqueEmail = `beta-e2e-${Date.now()}@ssota.test`;

    await page
      .locator("section")
      .first()
      .getByRole("button", { name: "베타 알림 받기" })
      .click();
    await expect(
      page.getByRole("heading", { name: "베타 오픈 알림 받기" }),
    ).toBeVisible();

    await page.getByLabel("이메일").fill(uniqueEmail);
    await page.getByRole("button", { name: "알림 신청" }).click();

    await expect(
      page.getByText("베타 알림 신청이 완료되었습니다."),
    ).toBeVisible();
  });
});
