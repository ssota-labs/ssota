import { expect, test } from "@playwright/test";
import {
  automatedScenarios,
  BILLING_SCENARIOS,
  type BillingScenario,
} from "../../helpers/billing-scenarios";

test.describe("billing scenario registry @billing", () => {
  test("catalog has unique scenario ids", () => {
    const ids = BILLING_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("automated e2e scenarios declare spec files in catalog", () => {
    const missing: BillingScenario[] = [];
    for (const scenario of automatedScenarios()) {
      if (scenario.tier !== "e2e-oss" && scenario.tier !== "e2e-stripe") continue;
      if (!scenario.spec) missing.push(scenario);
    }

    expect(
      missing,
      `Add spec path to e2e/helpers/billing-scenarios.ts for: ${missing.map((s) => s.id).join(", ")}`,
    ).toEqual([]);
  });

  test("prints coverage summary", async () => {
    const byAutomation = Object.groupBy(BILLING_SCENARIOS, (s) => s.automation);
    const summary = {
      total: BILLING_SCENARIOS.length,
      yes: byAutomation.yes?.length ?? 0,
      manual: byAutomation.manual?.length ?? 0,
      planned: byAutomation.planned?.length ?? 0,
      skip: byAutomation.skip?.length ?? 0,
    };
    await test.info().attach("billing-scenario-summary.json", {
      body: JSON.stringify(summary, null, 2),
      contentType: "application/json",
    });
    expect(summary.total).toBeGreaterThan(50);
  });
});
