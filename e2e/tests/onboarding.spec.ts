import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import {
  completeOnboardingFlow,
  completeProfileOnboarding,
  completeProjectDraftOnboarding,
  signInOnLoginPage,
  uniqueOnboardingEmail,
} from "../helpers/onboarding";

test.describe("Console onboarding", () => {
  test("신규 로그인(자동 가입) → profile → project → Overview", async ({ page }) => {
    const { orgSlug, projectSlug, organizationName, projectName } =
      await completeOnboardingFlow(page);

    expect(orgSlug).toMatch(/^e2e-organization-/);
    expect(projectSlug).toMatch(/^e2e-project-/);
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${projectSlug}/overview$`));
    await expect(page.getByText("No graph nodes yet")).toBeVisible();
    await expect(page.getByText(projectName).first()).toBeVisible();
  });

  test("template 스텝에서 project로 돌아가기", async ({ page }) => {
    const email = uniqueOnboardingEmail();
    const projectName = "Back Test Project";

    await signInOnLoginPage(page, email);
    await completeProfileOnboarding(page, "Back Test Organization");
    await completeProjectDraftOnboarding(page, projectName);

    await page.getByRole("button", { name: "Back to project" }).click();

    await expect(page).toHaveURL(/\/onboarding\/project/);
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(page.getByLabel("Project name")).toHaveValue(projectName);
    await expect(
      page.locator("[data-sonner-toast]").getByText(/organization created/i),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/template/, { timeout: 15_000 });
  });

  test("project 스텝에서 organization으로 돌아가기", async ({ page }) => {
    const email = uniqueOnboardingEmail();
    await signInOnLoginPage(page, email);
    await completeProfileOnboarding(page, "Back Test Organization");

    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(
      page.locator("[data-sonner-toast]").getByText(/organization created/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back to organization" }).click();

    await expect(page).toHaveURL(/\/onboarding\/profile/);
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByLabel("Organization name")).toHaveValue(
      "Back Test Organization",
    );

    await page.getByRole("button", { name: "Continue" }).click();
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
