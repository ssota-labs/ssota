import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function uniqueOnboardingSuffix(): string {
  return `${Date.now()}`;
}

export function uniqueOnboardingEmail(): string {
  return `onboarding-e2e-${uniqueOnboardingSuffix()}@ssota.test`;
}

export const ONBOARDING_PASSWORD = "onboarding-test-password-123";

export async function signInOnLoginPage(
  page: Page,
  email: string,
  password = ONBOARDING_PASSWORD,
): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/onboarding\/profile/, { timeout: 15_000 });
}

/** @deprecated use signInOnLoginPage */
export const signUpOnLoginPage = signInOnLoginPage;

export async function completeProfileOnboarding(
  page: Page,
  organizationName: string,
): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Create your organization" }),
  ).toBeVisible();

  await page.getByLabel("Organization name").fill(organizationName);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/onboarding\/project/, { timeout: 15_000 });
}

export async function completeProjectOnboarding(
  page: Page,
  projectName: string,
): Promise<{ orgSlug: string; projectSlug: string }> {
  await expect(
    page.getByRole("heading", { name: "Create your first project" }),
  ).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText("Nothing here yet")).toBeVisible({
    timeout: 15_000,
  });

  const url = new URL(page.url());
  const [, orgSlug, projectSlug] = url.pathname.split("/");
  if (!orgSlug || !projectSlug) {
    throw new Error(`Expected /{org}/{project} URL, got ${url.pathname}`);
  }

  return { orgSlug, projectSlug };
}

export async function completeOnboardingFlow(
  page: Page,
  email = uniqueOnboardingEmail(),
): Promise<{
  email: string;
  orgSlug: string;
  projectSlug: string;
  organizationName: string;
  projectName: string;
}> {
  const suffix = uniqueOnboardingSuffix();
  const organizationName = `E2E Organization ${suffix}`;
  const projectName = `E2E Project ${suffix}`;

  await signInOnLoginPage(page, email);
  await completeProfileOnboarding(page, organizationName);
  const { orgSlug, projectSlug } = await completeProjectOnboarding(
    page,
    projectName,
  );

  return { email, orgSlug, projectSlug, organizationName, projectName };
}
