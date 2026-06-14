import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import {
  completeOnboardingFlow,
  completeProfileOnboarding,
  signInOnLoginPage,
  uniqueOnboardingEmail,
} from "../helpers/onboarding";

test.describe("Console onboarding", () => {
  test("신규 로그인(자동 가입) → profile → project → Developer Start", async ({ page }) => {
    const { orgSlug, projectSlug, organizationName, projectName } =
      await completeOnboardingFlow(page);

    expect(orgSlug).toMatch(/^e2e-organization-/);
    expect(projectSlug).toMatch(/^e2e-project-/);
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${projectSlug}$`));
    await expect(page.getByRole("heading", { name: "Developer Start" })).toBeVisible();
    await expect(page.getByText(projectName).first()).toBeVisible();
  });

  test("project 스텝에서 organization으로 돌아가기", async ({ page }) => {
    const email = uniqueOnboardingEmail();
    await signInOnLoginPage(page, email);
    await completeProfileOnboarding(page, "Back Test Organization");

    await expect(page.getByText("Step 2 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Back to organization" }).click();

    await expect(page).toHaveURL(/\/onboarding\/profile/);
    await expect(page.getByText("Step 1 of 2")).toBeVisible();
    await expect(page.getByLabel("Organization name")).toHaveValue(
      "Back Test Organization",
    );

    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/onboarding\/project/, { timeout: 15_000 });
  });

  test("온보딩 미완료 시 콘솔 URL 접근 → project 스텝으로 리다이렉트", async ({
    page,
  }) => {
    const email = uniqueOnboardingEmail();
    await signInOnLoginPage(page, email);
    await completeProfileOnboarding(page, "Redirect Organization");

    await page.goto("/redirect-organization/should-not-exist");
    await expect(page).toHaveURL(/\/onboarding\/project/);
  });

  test("기존 smoke 계정은 온보딩 없이 콘솔 진입", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
