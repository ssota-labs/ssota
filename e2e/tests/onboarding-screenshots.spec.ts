import { test, expect } from "@playwright/test";
import {
  completeProfileOnboarding,
  completeProjectOnboarding,
  signUpOnLoginPage,
  uniqueOnboardingEmail,
  uniqueOnboardingSuffix,
} from "../helpers/onboarding";

test.describe("Console onboarding screenshots", () => {
  test("capture profile, project, and home steps", async ({ page }) => {
    const suffix = uniqueOnboardingSuffix();
    const email = uniqueOnboardingEmail();
    const workspaceName = `Acme Workspace ${suffix}`;
    const projectName = `SSOTA Dev ${suffix}`;

    await signUpOnLoginPage(page, email);
    await expect(
      page.getByRole("heading", { name: "Create your workspace" }),
    ).toBeVisible();
    await page.getByLabel("Display name").fill("Alex Kim");
    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.screenshot({
      path: "report/screenshots/onboarding-01-profile.png",
      fullPage: true,
    });

    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/onboarding\/project/);
    await page.getByLabel("Project name").fill(projectName);
    await page.screenshot({
      path: "report/screenshots/onboarding-02-project.png",
      fullPage: true,
    });

    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: "report/screenshots/onboarding-03-home.png",
      fullPage: true,
    });
  });
});
