import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("landing: renders the AI CPO narrative and product preview", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "The AI CPO for your Agent Team",
      }),
    ).toBeVisible();
    await expect(page.getByText("AI 개발 에이전트의 CPO")).toBeVisible();
    await expect(page.getByLabel("SSOTA workspace preview")).toBeVisible();
    await expect(page.getByText("Intent control loop")).toBeVisible();
    await expect(page.getByText("Approval queue")).toBeVisible();

    await page.getByRole("link", { name: "See the loop" }).click();
    await expect(
      page.getByRole("heading", {
        name: "작업 전에는 맥락을 읽고, 작업 후에는 근거를 남깁니다.",
      }),
    ).toBeVisible();
  });

  test("landing: primary CTA sends unauthenticated visitors to login", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Connect your agents" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
