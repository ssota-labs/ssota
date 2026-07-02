import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  getToolcraftDecisionRule,
  getToolcraftDecisionRulesByArea,
  TOOLCRAFT_DECISION_CONTRACT,
} from "./decision-contracts";

const contractsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(contractsDir, "../../../..");

function readRepoFile(pathFromRoot: string): string {
  return readFileSync(resolve(repoRoot, pathFromRoot), "utf8");
}

describe("Toolcraft template decision contract", () => {
  it("classifies every rule by level, verdict, and enforcement", () => {
    expect(TOOLCRAFT_DECISION_CONTRACT.length).toBeGreaterThanOrEqual(12);

    for (const rule of TOOLCRAFT_DECISION_CONTRACT) {
      expect(rule.id).toMatch(/^[a-z0-9-]+$/);
      expect(rule.area).toMatch(
        /^(runtime-shell|canvas|panels|layers|timeline|controls|renderer|reference-analysis|reference-clone|acceptance|performance|persistence|workflow)$/,
      );
      expect(rule.title.trim().length).toBeGreaterThan(0);
      expect(rule.currentConstraint.trim().length).toBeGreaterThan(0);
      expect(rule.desiredBehavior.trim().length).toBeGreaterThan(0);
      expect(rule.enforcement.length).toBeGreaterThan(0);
    }
  });

  it("keeps canvas app UI out of canvasContent as an invariant", () => {
    const rule = getToolcraftDecisionRule("canvas-no-app-ui");

    expect(rule?.level).toBe("invariant");
    expect(rule?.verdict).toBe("move-to-validator");
    expect(rule?.enforcement).toContain("browser-helper");
    expect(rule?.desiredBehavior).toMatch(/product result/i);
    expect(rule?.desiredBehavior).toMatch(/uploaded or imported content is part/i);
    expect(rule?.desiredBehavior).toMatch(/fake sample output/i);
    expect(rule?.desiredBehavior).toMatch(/agent-invented preset modes/i);
    expect(rule?.desiredBehavior).toMatch(/worklog records that evidence/i);
    expect(rule?.currentConstraint).toMatch(/uploaded\/imported source-material flows/i);
  });

  it("keeps runtime shell bypass prevention in validators, not only docs", () => {
    const rule = getToolcraftDecisionRule("runtime-shell-required");

    expect(rule?.level).toBe("invariant");
    expect(rule?.desiredBehavior).toMatch(/schema controls/i);
    expect(rule?.desiredBehavior).toMatch(/canvasContent/i);
    expect(rule?.desiredBehavior).toMatch(/controlRenderers/i);
    expect(rule?.desiredBehavior).toMatch(/onPanelAction/i);
    expect(rule?.desiredBehavior).toMatch(/low-level runtime surfaces/i);
    expect(rule?.desiredBehavior).toMatch(/built-in control components directly/i);
    expect(rule?.enforcement).toContain("cli-integrity-check");
    expect(rule?.enforcement).toContain("acceptance-validator");
  });

  it("keeps layers and timeline as heuristics until enabled", () => {
    expect(getToolcraftDecisionRule("layers-enable-only-when-needed")?.level).toBe(
      "heuristic",
    );
    expect(getToolcraftDecisionRule("layers-enabled-behavior")?.level).toBe(
      "invariant",
    );
    expect(getToolcraftDecisionRule("timeline-mode-choice")?.level).toBe("heuristic");
    expect(getToolcraftDecisionRule("timeline-mode-choice")?.desiredBehavior).toMatch(
      /Animation Intent Inventory/,
    );
    expect(getToolcraftDecisionRule("timeline-enabled-behavior")?.level).toBe(
      "invariant",
    );
  });

  it("makes renderer technology a default with escape hatches", () => {
    const rule = getToolcraftDecisionRule("renderer-technique-inventory");

    expect(rule?.level).toBe("default");
    expect(rule?.desiredBehavior).toMatch(/product output semantics/i);
    expect(rule?.enforcement).toContain("performance-validator");
  });

  it("requires reference clone functionality to be inventoried and acceptance-backed", () => {
    const rule = getToolcraftDecisionRule("reference-clone-source-of-truth");

    expect(rule?.level).toBe("invariant");
    expect(rule?.desiredBehavior).toMatch(/referenceStudy evidence/i);
    expect(rule?.desiredBehavior).toMatch(/running the original or restoring it locally/i);
    expect(rule?.desiredBehavior).toMatch(/reference feature inventory/i);
    expect(rule?.desiredBehavior).toMatch(/feature-level behavior evidence/i);
    expect(rule?.desiredBehavior).toMatch(/user-visible and output-affecting feature/i);
    expect(rule?.desiredBehavior).toMatch(/Toolcraft implementation/i);
    expect(rule?.desiredBehavior).toMatch(/acceptance coverage/i);
    expect(rule?.desiredBehavior).toMatch(/explicit user approval/i);
    expect(rule?.enforcement).toContain("acceptance-validator");
  });

  it("requires video references to be studied as behavior before implementation", () => {
    const rule = getToolcraftDecisionRule("video-reference-analysis");

    expect(rule?.level).toBe("invariant");
    expect(rule?.area).toBe("reference-analysis");
    expect(rule?.desiredBehavior).toMatch(/video, GIF, screen recording/i);
    expect(rule?.desiredBehavior).toMatch(/storyboard/i);
    expect(rule?.desiredBehavior).toMatch(/timecoded frame observations/i);
    expect(rule?.desiredBehavior).toMatch(/frame-to-frame transitions/i);
    expect(rule?.desiredBehavior).toMatch(/map those observed behaviors to acceptance rows/i);
    expect(rule?.desiredBehavior).toMatch(/independent from loop duration or timeline choice/i);
    expect(rule?.enforcement).toContain("acceptance-validator");
    expect(rule?.enforcement).toContain("starter-agents");
  });

  it("splits performance into workload and lightweight responsiveness coverage", () => {
    const rule = getToolcraftDecisionRule("performance-coverage-levels");

    expect(rule?.level).toBe("invariant");
    expect(rule?.desiredBehavior).toMatch(/workload/i);
    expect(rule?.desiredBehavior).toMatch(/responsiveness/i);
    expect(rule?.desiredBehavior).toMatch(/canvas drag, pan, pinch, zoom, and radar\/center/i);
    expect(rule?.desiredBehavior).toMatch(/playback state/i);
    expect(rule?.desiredBehavior).toMatch(/first working version/i);
    expect(rule?.desiredBehavior).toMatch(/agent's controlled browser/i);
    expect(rule?.desiredBehavior).toMatch(/Playwright is only the fallback runner/i);
    expect(rule?.desiredBehavior).toMatch(/optimize performance/i);
    expect(rule?.desiredBehavior).toMatch(/otherwise complains about performance/i);
    expect(rule?.desiredBehavior).toMatch(/targeted functional\/browser checks/i);
    expect(rule?.desiredBehavior).toMatch(/touched workload\/viewport\/export paths/i);
    expect(rule?.desiredBehavior).toMatch(/full performance checkpoint/i);
  });

  it("requires persistence reload coverage when localStorage is enabled", () => {
    const rule = getToolcraftDecisionRule("persistence-policy-explicit");

    expect(rule?.desiredBehavior).toMatch(/localStorage persistence/i);
    expect(rule?.desiredBehavior).toMatch(/reloading the page/i);
    expect(rule?.desiredBehavior).toMatch(/settings import\/export is not a substitute/i);
    expect(rule?.enforcement).toContain("acceptance-validator");
    expect(rule?.enforcement).toContain("browser-helper");
  });

  it("groups rules by area", () => {
    expect(getToolcraftDecisionRulesByArea("canvas").map((rule) => rule.id)).toContain(
      "canvas-no-app-ui",
    );
  });

  it("uses neutral workflow rule ids in public contract data", () => {
    const legacyWorkflowRuleId = ["ai", "workflow", "required"].join("-");

    expect(getToolcraftDecisionRule("workflow-required")?.area).toBe("workflow");
    expect(getToolcraftDecisionRule(legacyWorkflowRuleId)).toBeUndefined();
  });

  it("keeps public docs, local docs, and app assembly instructions synced with rule ids", () => {
    const docsSource = readRepoFile(
      "apps/website/src/content/docs/toolcraft-decision-contract.md",
    );
    const rootAgentsSource = readRepoFile("AGENTS.md");
    const starterAgentsSource = readRepoFile("starter/AGENTS.md");
    const starterDecisionSource = readRepoFile("starter/docs/toolcraft/decision-contract.md");
    const starterDocsCheckSource = readRepoFile("starter/scripts/check-toolcraft-docs.mjs");

    for (const rule of TOOLCRAFT_DECISION_CONTRACT) {
      expect(docsSource, `Docs page must list decision rule "${rule.id}".`).toContain(rule.id);
      expect(rootAgentsSource, `Root AGENTS.md must list decision rule "${rule.id}".`).toContain(
        rule.id,
      );
      expect(
        starterAgentsSource,
        `Starter AGENTS.md must list decision rule "${rule.id}" for generated apps.`,
      ).toContain(rule.id);
      expect(
        starterDecisionSource,
        `Starter local decision docs must list decision rule "${rule.id}".`,
      ).toContain(rule.id);
      expect(
        starterDocsCheckSource,
        `Starter docs check must enforce decision rule "${rule.id}".`,
      ).toContain(rule.id);
    }
  });

  it("keeps root AGENTS.md as a concise entry map instead of duplicated rule prose", () => {
    const rootAgentsSource = readRepoFile("AGENTS.md");
    const rootAgentsLines = rootAgentsSource.trim().split(/\r?\n/);
    const forbiddenDuplicatedSectionHeadings = [
      "Reference Runtime Clone Mode",
      "Always-On Canvas Capabilities",
      "Optional Surfaces",
      "Panel Rules",
      "Control Rules",
      "App Completion Bar",
    ];
    const requiredEntryMapRefs = [
      "starter/docs/toolcraft/assembly-workflow.md",
      "starter/docs/toolcraft/decision-contract.md",
      "starter/docs/toolcraft/schema-reference.md",
      "starter/docs/toolcraft/component-rules.md",
      "starter/docs/toolcraft/acceptance-testing.md",
      "starter/docs/toolcraft/performance.md",
      "starter/docs/toolcraft/renderer-technique.md",
      "starter/docs/toolcraft/custom-controls.md",
      "packages/toolcraft-runtime/src/contracts/decision-contracts.ts",
      "packages/toolcraft-runtime/src/contracts/component-contracts.ts",
    ];

    expect(rootAgentsLines.length).toBeLessThanOrEqual(180);
    expect(rootAgentsSource).toContain("## Quick Entry Contract");
    expect(rootAgentsSource).toContain("## Detailed References");

    for (const heading of forbiddenDuplicatedSectionHeadings) {
      expect(rootAgentsSource, `Root AGENTS.md should link out instead of duplicating "${heading}".`).not.toContain(
        `## ${heading}`,
      );
    }

    for (const ref of requiredEntryMapRefs) {
      expect(rootAgentsSource, `Root AGENTS.md should link to "${ref}".`).toContain(ref);
    }
  });

  it("keeps required local Toolcraft docs available for generated apps", () => {
    const requiredLocalDocs = [
      "README.md",
      "assembly-workflow.md",
      "decision-contract.md",
      "schema-reference.md",
      "acceptance-testing.md",
      "performance.md",
      "renderer-technique.md",
      "custom-controls.md",
      "component-rules.md",
    ];

    for (const docName of requiredLocalDocs) {
      expect(() => readRepoFile(`starter/docs/toolcraft/${docName}`)).not.toThrow();
    }
  });
});
