import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAsSmoke } from "../../helpers/auth";
import { gotoProject } from "../../helpers/console";
import {
  getSmokeOrganizationId,
  readBillingStatus,
  resetOrganizationBilling,
  seedOrganizationBilling,
} from "../../helpers/billing";

test.describe("billing entitlement gate @billing @stripe @gate", () => {
  let organizationId: string;

  test.beforeAll(async () => {
    organizationId = await getSmokeOrganizationId();
  });

  test.beforeEach(async () => {
    await resetOrganizationBilling(organizationId);
  });

  // @billing-scenario B1
  test("unpaid org is redirected from overview to billing", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/billing/, {
      timeout: 15_000,
    });
  });

  // @billing-scenario B2
  test("unpaid org can open settings/billing", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "settings/billing");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/billing/);
    await expect(page.getByRole("heading", { name: /billing|구독/i })).toBeVisible();
  });

  // @billing-scenario B3
  test("unpaid org can open settings/general", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "settings/general");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/general/);
    await expect(page.getByRole("heading", { name: /general|일반/i })).toBeVisible();
  });

  // @billing-scenario B4
  test("unpaid org is redirected from settings/account", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "settings/account");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/billing/);
  });

  // @billing-scenario B5
  test("unpaid org is redirected from settings/developer", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "settings/developer");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/billing/);
  });

  // @billing-scenario B6
  test("owner sees Subscribe controls on billing page", async ({ page }) => {
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "settings/billing");
    await expect(page.getByRole("button", { name: /subscribe.*starter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /subscribe.*business/i })).toBeVisible();
  });

  // @billing-scenario E5
  test("past_due org is redirected from overview to billing", async ({ page }) => {
    await seedOrganizationBilling({
      organizationId,
      status: "past_due",
    });
    await loginAsSmoke(page, { skipOverviewAssert: true });
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(/\/ssota-labs\/settings\/billing/);
  });

  // @billing-scenario C8
  // @billing-scenario H2-3
  test("active org can access overview and sees entitled badge", async ({ page }) => {
    await seedOrganizationBilling({
      organizationId,
      status: "active",
      seatQuantity: 2,
    });
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(/\/ssota-labs\/overview/);

    await gotoProject(page, "settings/billing");
    await expect(page.getByText(/active access|이용 가능/i)).toBeVisible();
  });

  // @billing-scenario H2-4
  test("billing page reflects seeded seat quantity", async ({ page }) => {
    await seedOrganizationBilling({
      organizationId,
      status: "active",
      seatQuantity: 3,
    });
    await loginAsSmoke(page);
    await gotoProject(page, "settings/billing");
    await expect(page.getByText("3")).toBeVisible();
  });

  // @billing-scenario G3
  test("unauthenticated user is redirected to login from billing", async ({ page }) => {
    await page.goto("/ssota-labs/settings/billing");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("billing trialing entitlement @billing @stripe @gate", () => {
  let organizationId: string;

  test.beforeAll(async () => {
    organizationId = await getSmokeOrganizationId();
  });

  test.afterEach(async () => {
    await resetOrganizationBilling(organizationId);
  });

  test("trialing org can access overview", async ({ page }) => {
    await seedOrganizationBilling({
      organizationId,
      status: "trialing",
    });
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(/\/ssota-labs\/overview/);
    expect(await readBillingStatus(organizationId)).toBe("trialing");
  });
});
