#!/usr/bin/env tsx
/**
 * Stripe billing scenario runner — SSOT catalog, automated tiers, CLI/manual checklists.
 *
 * Usage:
 *   pnpm stripe:smoke              # summary + CLI/agent-browser checklist
 *   pnpm stripe:smoke --list       # TSV of all scenarios
 *   pnpm stripe:smoke --clock      # Test Clock runbook (E1–E4, E6, E7)
 *   pnpm stripe:smoke --run unit   # Vitest: core + ee
 *   pnpm stripe:smoke --run integration
 *   pnpm stripe:smoke --run e2e-oss
 *   pnpm stripe:smoke --run e2e-stripe
 *   pnpm stripe:smoke --run all    # unit + integration + e2e-oss + e2e-stripe
 *
 * @see e2e/helpers/billing-scenarios.ts
 * @see packages/ee/docs/test-clocks.md
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  BILLING_SCENARIOS,
  type BillingScenario,
  type BillingScenarioTier,
} from "../e2e/helpers/billing-scenarios";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type RunTier = "unit" | "integration" | "e2e-oss" | "e2e-stripe" | "all";

function printHeader(title: string) {
  console.log(`\n${"─".repeat(60)}\n${title}\n${"─".repeat(60)}`);
}

function scenarioRow(s: BillingScenario): string {
  const auto = s.automation.padEnd(8);
  const tier = s.tier.padEnd(12);
  const note = s.notes ? ` — ${s.notes}` : "";
  return `  ${s.id.padEnd(6)} ${auto} ${tier} ${s.title}${note}`;
}

function printTestClockRunbook() {
  const docPath = join(root, "packages/ee/docs/test-clocks.md");
  printHeader("Test Clock runbook (E1–E4, E6, E7)");
  console.log(`Full doc: ${docPath}\n`);
  console.log(`
Prerequisites
  • Stripe CLI logged in (test mode): stripe login
  • Web on :3000 with BILLING=stripe and sk_test_ keys in apps/web/.env.local
  • Terminal A: pnpm dev --filter web
  • Terminal B: stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
    (copy whsec_… into STRIPE_WEBHOOK_SECRET)

Setup (once per clock run)
  1. Stripe Dashboard → Developers → Test clocks → Create clock
  2. Create Customer attached to the clock
  3. Console → unpaid org → Subscribe (customer must use clock-backed customer)
     Or create subscription via API with trial if testing E1

Verify DB after each step (optional):
  psql "$DATABASE_URL" -c \\
    "SELECT status, cancel_at_period_end, current_period_end FROM organization_billing WHERE organization_id = '<org-uuid>';"

| Step | Scenario | Action | Expect in DB / UI |
|------|----------|--------|-------------------|
| E1   | Trial start | Checkout with trial (STRIPE_TRIAL_DAYS>0) or subscription.created | status = trialing |
| E2   | Trial → active | Advance clock past trial end (card 4242…) | status = active |
| E3   | Renewal | Advance one billing period | active, current_period_end moved forward |
| E4   | Payment fail | Attach failing card 4000000000000341, advance period | status = past_due; gate → billing |
| E6   | Cancel schedule | Portal → cancel at period end | active + cancel_at_period_end = true |
| E7   | Period end cancel | Advance clock past cancel date | status = canceled (or deleted webhook) |

Playwright webhook fixtures (CI, no clock): pnpm e2e:billing -- tests/billing-stripe/webhook.spec.ts
Gate past_due (E5): pnpm e2e:billing -- tests/billing-stripe/gate.spec.ts --grep past_due
`);
  try {
    const doc = readFileSync(docPath, "utf8");
    const scenarios = doc.match(/\| Trial start[\s\S]*?\| Subscription deleted[\s\S]*?\|/);
    if (scenarios) {
      printHeader("Reference table (from test-clocks.md)");
      console.log(scenarios[0]);
    }
  } catch {
    /* doc optional at read time */
  }
}

function printManualChecklist() {
  printHeader("CLI / agent-browser checklist");
  console.log(`
1. Webhooks (F1, live paths):
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

2. Live Checkout (B8, C1–C3, C5, G1):
   STRIPE_E2E_LIVE=1 pnpm e2e:billing:live
   agent-browser on checkout.stripe.com — card 4242 4242 4242 4242

3. Customer Portal (D1–D3, D6):
   Settings → Billing → Manage in Stripe Portal

4. Test Clock (E1–E4, E6, E7):
   pnpm stripe:smoke --clock

5. Declined card (C5): 4000 0000 0000 0002

6. Reports + per-test video:
   pnpm e2e:billing:record && pnpm e2e:billing:open hub
`);
}

function printSummary() {
  printHeader("Billing scenario catalog (SSOT: e2e/helpers/billing-scenarios.ts)");
  const byAutomation = Object.groupBy(BILLING_SCENARIOS, (s) => s.automation);
  console.log(`Total: ${BILLING_SCENARIOS.length}`);
  console.log(
    `  automated: ${byAutomation.yes?.length ?? 0} | manual: ${byAutomation.manual?.length ?? 0} | planned: ${byAutomation.planned?.length ?? 0} | skip: ${byAutomation.skip?.length ?? 0}`,
  );

  const tiers: BillingScenarioTier[] = [
    "unit",
    "integration",
    "e2e-oss",
    "e2e-stripe",
    "e2e-live",
    "cli",
    "manual",
  ];
  for (const tier of tiers) {
    const items = BILLING_SCENARIOS.filter((s) => s.tier === tier);
    if (items.length === 0) continue;
    printHeader(`${tier} (${items.length})`);
    for (const s of items) console.log(scenarioRow(s));
  }

  printManualChecklist();
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): number {
  console.log(`\n$ ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

function runUnit(): number {
  let code = run("pnpm", [
    "--filter",
    "@ssota/core",
    "test",
    "--",
    "assert-cloud-entitlement",
  ]);
  if (code !== 0) return code;
  return run("pnpm", ["--filter", "@ssota/ee", "test", "--", "sync-subscription"]);
}

function runIntegration(): number {
  let code = run("pnpm", [
    "--filter",
    "@ssota/adapter-postgres",
    "test",
    "--",
    "billing-port",
  ]);
  if (code !== 0) return code;
  return run("pnpm", ["--filter", "web", "test", "--", "sync-seats"]);
}

function runE2eOss(): number {
  return run("pnpm", [
    "--filter",
    "e2e",
    "exec",
    "playwright",
    "test",
    "-c",
    "playwright.billing-oss.config.ts",
  ]);
}

function runE2eStripe(): number {
  return run("pnpm", [
    "--filter",
    "e2e",
    "exec",
    "playwright",
    "test",
    "-c",
    "playwright.billing.config.ts",
  ]);
}

function runTier(tier: RunTier): number {
  switch (tier) {
    case "unit":
      return runUnit();
    case "integration":
      return runIntegration();
    case "e2e-oss":
      return runE2eOss();
    case "e2e-stripe":
      return runE2eStripe();
    case "all": {
      for (const t of ["unit", "integration", "e2e-oss", "e2e-stripe"] as const) {
        const code = runTier(t);
        if (code !== 0) return code;
      }
      return 0;
    }
    default:
      console.error(`Unknown tier: ${tier}`);
      return 1;
  }
}

const args = process.argv.slice(2);

if (args.includes("--clock")) {
  printTestClockRunbook();
  process.exit(0);
}

if (args.includes("--list")) {
  for (const s of BILLING_SCENARIOS) {
    console.log(
      [s.id, s.tier, s.automation, s.spec ?? "", s.title].join("\t"),
    );
  }
  process.exit(0);
}

printSummary();

const runArg = args.find((a) => a.startsWith("--run"));
const runValue = runArg?.includes("=")
  ? runArg.split("=")[1]
  : args[args.indexOf("--run") + 1];

if (runValue) {
  const code = runTier(runValue as RunTier);
  process.exit(code);
}

console.log("\nTips:");
console.log("  pnpm stripe:smoke --clock     # Test Clock steps E1–E7");
console.log("  pnpm stripe:smoke --run all   # automated tiers only\n");
