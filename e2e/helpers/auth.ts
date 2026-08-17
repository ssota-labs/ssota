import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
  SMOKE_MEMBER_EMAIL,
  SMOKE_MEMBER_PASSWORD,
} from "@ssota/adapter-postgres";
import { DEFAULT_CONSOLE_BASE } from "./console";

export type LoginAsSmokeOptions = {
  /** When BILLING=stripe and org is unpaid, login lands on billing — skip overview assert. */
  skipOverviewAssert?: boolean;
};

async function submitLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 180_000,
    waitUntil: "commit",
  });
}

export async function loginAsSmoke(
  page: Page,
  options?: LoginAsSmokeOptions,
): Promise<void> {
  await submitLogin(page, SMOKE_EMAIL, SMOKE_PASSWORD);

  if (options?.skipOverviewAssert) {
    return;
  }

  await page.goto(`${DEFAULT_CONSOLE_BASE}/overview`);
  await expect(page.getByText("Open tasks")).toBeVisible({
    timeout: 30_000,
  });
}

export async function loginAsSmokeMember(
  page: Page,
  options: LoginAsSmokeOptions = {},
): Promise<void> {
  await submitLogin(page, SMOKE_MEMBER_EMAIL, SMOKE_MEMBER_PASSWORD);

  if (options.skipOverviewAssert) {
    return;
  }

  await page.goto(`${DEFAULT_CONSOLE_BASE}/overview`);
  await expect(page.getByText("Open tasks")).toBeVisible({
    timeout: 30_000,
  });
}
