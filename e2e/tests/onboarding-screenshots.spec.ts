import { test, expect } from "@playwright/test";
import {
  completeProfileOnboarding,
  completeProjectOnboarding,
  signInOnLoginPage,
  uniqueOnboardingEmail,
  uniqueOnboardingSuffix,
} from "../helpers/onboarding";

test.describe("Console onboarding screenshots", () => {
  test("capture profile, project, template, and home steps", async ({ page }) => {
    const suffix = uniqueOnboardingSuffix();
    const email = uniqueOnboardingEmail();
    const organizationName = `Acme Organization ${suffix}`;
    const projectName = `SSOTA Dev ${suffix}`;

    await signInOnLoginPage(page, email);
    await expect(
      page.getByRole("heading", { name: "Create your organization" }),
    ).toBeVisible();
    await page.getByLabel("Organization name").fill(organizationName);
    await page.screenshot({
      path: "report/screenshots/onboarding-01-profile.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/project/);
    await page.getByLabel("Project name").fill(projectName);
    await page.screenshot({
      path: "report/screenshots/onboarding-02-project.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/template/);
    await page.screenshot({
      path: "report/screenshots/onboarding-03-template.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Open project" }).click();
    await expect(page).toHaveURL(/\/overview$/, { timeout: 30_000 });
    await expect(page.getByText("No graph nodes yet")).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: "report/screenshots/onboarding-04-home.png",
      fullPage: true,
    });
  });
});
