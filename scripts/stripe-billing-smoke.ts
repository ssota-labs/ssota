#!/usr/bin/env tsx
/**
 * Stripe billing scenario runner — lists the SSOT catalog and runs automated tiers.
 *
 * Usage:
 *   pnpm stripe:smoke              # print catalog summary + manual/cli checklist
 *   pnpm stripe:smoke --list       # full scenario table
 *   pnpm stripe:smoke --run unit   # Vitest: core + ee
 *   pnpm stripe:smoke --run integration
 *   pnpm stripe:smoke --run e2e-oss
 *   pnpm stripe:smoke --run e2e-stripe
 *   pnpm stripe:smoke --run all    # unit + integration + e2e-oss + e2e-stripe
 */
import { spawnSync } from "node:child_process";
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
  return `  ${s.id.padEnd(6)} ${auto} ${tier} ${s.title}`;
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

  printHeader("CLI / agent-browser checklist (manual)");
  console.log(`
1. Forward webhooks:
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

2. Live Checkout (C1, B8) — agent-browser on checkout.stripe.com:
   card 4242 4242 4242 4242, any future expiry/CVC

3. Customer Portal (D1–D3) — Settings → Manage in Stripe Portal

4. Test Clock (E1–E4, E7) — see packages/ee/docs/test-clocks.md

5. Declined card (C5): 4000 0000 0000 0002
`);
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
  return run("pnpm", [
    "--filter",
    "@ssota/adapter-postgres",
    "test",
    "--",
    "billing-port",
  ]);
}

function runE2eOss(): number {
  return run("pnpm", ["e2e:ci", "--", "--grep", "billing"]);
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
const listOnly = args.includes("--list");
const runArg = args.find((a) => a.startsWith("--run"));
const runValue = runArg?.includes("=")
  ? runArg.split("=")[1]
  : args[args.indexOf("--run") + 1];

if (listOnly) {
  for (const s of BILLING_SCENARIOS) {
    console.log(
      [s.id, s.tier, s.automation, s.spec ?? "", s.title].join("\t"),
    );
  }
  process.exit(0);
}

printSummary();

if (runValue) {
  const code = runTier(runValue as RunTier);
  process.exit(code);
}

console.log("\nTip: pnpm stripe:smoke --run all\n");
