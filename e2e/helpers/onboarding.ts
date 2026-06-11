import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function uniqueOnboardingEmail(): string {
  return `onboarding-e2e-${Date.now()}@loopos.test`;
}

export const ONBOARDING_PASSWORD = "onboarding-test-password-123";

export async function signUpOnLoginPage(
  page: Page,
  email: string,
  password = ONBOARDING_PASSWORD,
): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await page.getByRole("button", { name: "회원가입" }).click();
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/onboarding\/profile/, { timeout: 15_000 });
}

export async function completeProfileOnboarding(
  page: Page,
  input: { displayName: string; workspaceName: string },
): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();

  await page.getByLabel("Display name").fill(input.displayName);
  await page.getByLabel("Workspace name").fill(input.workspaceName);
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

  await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible({
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
): Promise<{ email: string; orgSlug: string; projectSlug: string }> {
  await signUpOnLoginPage(page, email);
  await completeProfileOnboarding(page, {
    displayName: "E2E User",
    workspaceName: "E2E Workspace",
  });
  const { orgSlug, projectSlug } = await completeProjectOnboarding(
    page,
    "E2E Project",
  );

  return { email, orgSlug, projectSlug };
}
