import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("landing: renders hero, narrative sections, pricing, and FAQ", async ({
    page,
  }) => {
    await page.goto("/home");

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
      page.getByRole("link", { name: /GitHub/i }),
    ).toHaveAttribute("href", "https://github.com/ssota-labs/loopos");
    await expect(
      page
        .locator("section")
        .first()
        .getByRole("button", { name: "베타 신청하기" }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: /우리 팀은 왜 똑같이 일하죠/,
      }),
    ).toBeVisible();
    await expect(page.getByText("뭐가 맞는지 모릅니다")).toBeVisible();
    await expect(page.getByText("맞춰 주는 일이 늘었습니다")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "AI 시대의 새로운 제품 개발 방식." }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "제품 맥락" })).toBeVisible();

    await page.getByRole("tab", { name: "제품 맥락" }).click();
    await expect(page.getByText("context graph")).toBeVisible();
    await expect(
      page.locator('[data-testid="dynamic-page-renderer"]').first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "MCP 연결" }).click();
    await expect(page.getByTestId("landing-mcp-connectors")).toBeVisible();
    await expect(page.getByTestId("connector-github")).toBeVisible();
    await expect(page.getByTestId("connector-slack")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "부담 없이 시작하세요." }),
    ).toBeVisible();
    await expect(page.getByText("Cloud Starter", { exact: true })).toBeVisible();
    await expect(
      page.locator("#pricing").getByText("Enterprise", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "궁금한 점들이 더 있나요?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "SSOTA MCP로 무엇을 할 수 있나요?" }),
    ).toBeVisible();
  });

  test("landing: root and /home both render marketing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/home");
    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("landing: beta signup dialog saves email", async ({ page }) => {
    await page.goto("/home");

    const uniqueEmail = `beta-e2e-${Date.now()}@ssota.test`;

    await page
      .locator("section")
      .first()
      .getByRole("button", { name: "베타 신청하기" })
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

  test("landing: language switcher toggles Korean ↔ English", async ({
    page,
  }) => {
    await page.goto("/home");

    // 기본(쿠키 없음)은 한국어
    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();

    // 헤더 스위처로 영어 전환
    const switcher = page.getByTestId("landing-locale-switcher");
    await switcher.click();
    await page.getByRole("option", { name: "English" }).click();

    await expect(
      page.getByRole("heading", {
        name: "The AI CPO that truly knows your product",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Opening this July")).toBeVisible();

    // 다시 한국어로 전환
    await switcher.click();
    await page.getByRole("option", { name: "한국어" }).click();

    await expect(
      page.getByRole("heading", {
        name: "제품을 완벽히 아는 AI CPO",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("landing: bottom CTA opens beta signup dialog", async ({ page }) => {
    await page.goto("/home");

    await page
      .locator("section")
      .filter({ hasText: "기존 코딩 에이전트에 AI CPO를 연결하세요" })
      .getByRole("button", { name: "베타 신청하기" })
      .click();
    await expect(
      page.getByRole("heading", { name: "베타 오픈 알림 받기" }),
    ).toBeVisible();
  });
});
