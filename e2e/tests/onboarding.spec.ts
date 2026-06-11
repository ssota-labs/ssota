import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import {
  completeOnboardingFlow,
  completeProfileOnboarding,
  signInOnLoginPage,
  uniqueOnboardingEmail,
} from "../helpers/onboarding";

test.describe("Console onboarding", () => {
  test("신규 로그인(자동 가입) → profile → project → Project Home", async ({ page }) => {
    const { orgSlug, projectSlug, workspaceName, projectName } =
      await completeOnboardingFlow(page);

    expect(orgSlug).toMatch(/^e2e-workspace-/);
    expect(projectSlug).toMatch(/^e2e-project-/);
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${projectSlug}$`));
    await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible();
    await expect(page.getByText(projectName).first()).toBeVisible();
  });

  test("온보딩 미완료 시 콘솔 URL 접근 → project 스텝으로 리다이렉트", async ({
    page,
  }) => {
    const email = uniqueOnboardingEmail();
    await signInOnLoginPage(page, email);
    await completeProfileOnboarding(page, "Redirect Workspace");

    await page.goto("/redirect-workspace/should-not-exist");
    await expect(page).toHaveURL(/\/onboarding\/project/);
  });

  test("기존 smoke 계정은 온보딩 없이 콘솔 진입", async ({ page }) => {
    await loginAsSmoke(page);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
