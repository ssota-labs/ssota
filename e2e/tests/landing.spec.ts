import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("landing: renders the AI CPO narrative and product preview", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("AI CPO for coding agents")).toBeVisible();
    await expect(page.getByLabel("SSOTA prompt preview")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /우리 팀은 왜 똑같이 일하죠/,
      }),
    ).toBeVisible();
    await expect(page.getByText("뭐가 맞는지 모릅니다")).toBeVisible();
    await expect(page.getByText("맞춰 주는 일이 늘었습니다")).toBeVisible();

    await page.getByRole("link", { name: "무엇이 다른가" }).click();
    await expect(
      page.getByRole("heading", {
        name: /지금 무엇이 진실인지 아는 AI/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /외부 데이터도 모두 연결하는 AI/,
      }),
    ).toBeVisible();
  });

  test("landing: primary CTA sends unauthenticated visitors to login", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .locator("header")
      .getByRole("button", { name: "Start", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
