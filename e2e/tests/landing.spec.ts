import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("landing: renders the AI CPO narrative and product preview", async ({
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
    await expect(page.getByText("AI CPO for coding agents")).toBeVisible();
    await expect(page.getByLabel("SSOTA prompt preview")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /우리 팀은 왜 똑같이 일하죠/,
      }),
    ).toBeVisible();
    await expect(page.getByText("뭐가 맞는지 모릅니다")).toBeVisible();
    await expect(page.getByText("맞춰 주는 일이 늘었습니다")).toBeVisible();

    await expect(page.getByRole("heading", { name: "AI 시대의 새로운 제품 개발 방식." })).toBeVisible();
    await expect(page.getByRole("tab", { name: "제품 맥락" })).toBeVisible();

    await page.getByRole("tab", { name: "MCP 연결" }).click();
    await expect(
      page.getByRole("heading", {
        name: /외부 데이터도 모두 연결하는 AI/,
      }),
    ).toBeVisible();
    await expect(page.getByText("MCP connections")).toBeVisible();

    await page.getByRole("tab", { name: "라이프사이클" }).click();
    await expect(
      page.getByRole("heading", {
        name: /흐름에 따라서 일하는 AI/,
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
