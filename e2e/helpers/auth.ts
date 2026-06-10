import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";

export async function loginAsSmoke(page: Page): Promise<void> {
  await page.goto("/login");
  const form = page.locator("main form");
  await form.getByPlaceholder("email").fill(SMOKE_EMAIL);
  await form.getByPlaceholder("password").fill(SMOKE_PASSWORD);
  await form.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("heading", { name: "LoopOS Console" })).toBeVisible({
    timeout: 15_000,
  });
}
