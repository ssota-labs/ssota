import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-postgres";

export type LoginAsSmokeOptions = {
  /** When BILLING=stripe and org is unpaid, login lands on billing — skip overview assert. */
  skipOverviewAssert?: boolean;
};

export async function loginAsSmoke(
  page: Page,
  options?: LoginAsSmokeOptions,
): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await form.getByLabel("Email").fill(SMOKE_EMAIL);
  await form.getByLabel("Password").fill(SMOKE_PASSWORD);
  await form.locator('button[type="submit"]').click();

  if (options?.skipOverviewAssert) {
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
    return;
  }

  await expect(page.getByText("Open tasks")).toBeVisible({
    timeout: 15_000,
  });
}
