import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-supabase";

export async function loginAsSmoke(page: Page): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await form.getByLabel("Email").fill(SMOKE_EMAIL);
  await form.getByLabel("Password").fill(SMOKE_PASSWORD);
  await form.locator('button[type="submit"]').click();

  await expect(page.getByRole("heading", { name: "Project Home" })).toBeVisible({
    timeout: 15_000,
  });
}
