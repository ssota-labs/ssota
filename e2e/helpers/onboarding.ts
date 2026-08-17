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
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/project/, { timeout: 15_000 });
}

export async function completeProjectDraftOnboarding(
  page: Page,
  projectName: string,
): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Create your first project" }),
  ).toBeVisible();

  await page.getByLabel("Teamspace name").fill(projectName);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/template/, { timeout: 15_000 });
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
}

export async function completeTemplateOnboarding(
  page: Page,
): Promise<{ orgSlug: string; teamspaceSlug: string }> {
  await expect(
    page.getByRole("heading", { name: "Choose a project template" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open project" }).click();

  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
    timeout: 30_000,
  });

  const url = new URL(page.url());
  const orgSlug = url.pathname.split("/").filter(Boolean)[0];
  if (!orgSlug) {
    throw new Error(`Expected /{org} URL, got ${url.pathname}`);
  }

  return { orgSlug, teamspaceSlug: orgSlug };
}

export async function completeProjectOnboarding(
  page: Page,
  projectName: string,
): Promise<{ orgSlug: string; teamspaceSlug: string }> {
  await completeProjectDraftOnboarding(page, projectName);
  return completeTemplateOnboarding(page);
}

export async function completeOnboardingFlow(
  page: Page,
  email = uniqueOnboardingEmail(),
): Promise<{
  email: string;
  orgSlug: string;
  teamspaceSlug: string;
  organizationName: string;
  projectName: string;
}> {
  const suffix = uniqueOnboardingSuffix();
  const organizationName = `E2E Organization ${suffix}`;
  const projectName = `E2E Teamspace ${suffix}`;

  await signInOnLoginPage(page, email);
  await completeProfileOnboarding(page, organizationName);
  const { orgSlug, teamspaceSlug } = await completeProjectOnboarding(
    page,
    projectName,
  );

  return { email, orgSlug, teamspaceSlug, organizationName, projectName };
}
