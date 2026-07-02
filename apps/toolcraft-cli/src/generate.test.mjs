import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { after, describe, it } from "node:test";

import { generateToolcraft } from "./generate.mjs";

const tempRoots = [];
const execFileAsync = promisify(execFile);

after(async () => {
  await Promise.all(
    tempRoots.map((tempRoot) => fs.rm(tempRoot, { force: true, recursive: true })),
  );
});

async function readTextFiles(rootDir) {
  const files = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!["dist", "node_modules"].includes(entry.name)) {
          await visit(filePath);
        }
        continue;
      }

      if (entry.name === "check-toolcraft-docs.mjs") {
        continue;
      }

      if (entry.isFile() && /\.(css|html|json|md|mjs|ts|tsx)$/.test(entry.name)) {
        files.push(await fs.readFile(filePath, "utf8"));
      }
    }
  }

  await visit(rootDir);
  return files.join("\n");
}

describe("generateToolcraft", () => {
  it("creates a standalone app with copied local toolcraft sources", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-cli-"));
    tempRoots.push(tempRoot);
    const targetDir = path.join(tempRoot, "generated-app");

    const result = await generateToolcraft({
      cwd: tempRoot,
      force: true,
      name: "Generated App",
      targetDir: "generated-app",
    });

    assert.equal(result.targetDir, targetDir);
    assert.equal(result.packageName, "generated-app");
    assert.ok(await fs.stat(path.join(targetDir, "src/toolcraft/ui/index.ts")));
    assert.ok(
      await fs.stat(path.join(targetDir, "src/toolcraft/runtime/react/index.ts")),
    );

    const packageJson = JSON.parse(await fs.readFile(path.join(targetDir, "package.json"), "utf8"));
    assert.equal(packageJson.license, "SEE LICENSE IN LICENSE.md");
    assert.equal(packageJson.dependencies["@repo/ui"], undefined);
    assert.equal(packageJson.dependencies["@repo/toolcraft-runtime"], undefined);
    assert.equal(packageJson.dependencies["@tanstack/react-router"], "1.170.6");
    assert.equal(packageJson.dependencies.cmdk, "^1.1.1");
    assert.equal(packageJson.dependencies["react-resizable-panels"], "^4.10.0");
    assert.equal(packageJson.dependencies.sonner, "^2.0.7");
    assert.equal(packageJson.devDependencies["@repo/typescript-config"], undefined);
    assert.equal(packageJson.devDependencies["@playwright/test"], "^1.51.1");
    assert.equal(packageJson.scripts["ai:check"], "node scripts/check-ai-skills.mjs");
    assert.equal(packageJson.scripts.dev, "node scripts/run-vite-on-free-port.mjs dev");
    assert.equal(
      packageJson.scripts["dev:restart"],
      "node scripts/run-vite-on-free-port.mjs dev --toolcraft-restart",
    );
    assert.equal(packageJson.scripts.preview, "node scripts/run-vite-on-free-port.mjs preview");
    assert.equal(
      packageJson.scripts["preview:restart"],
      "node scripts/run-vite-on-free-port.mjs preview --toolcraft-restart",
    );
    assert.equal(packageJson.scripts["docs:check"], "node scripts/check-toolcraft-docs.mjs");
    assert.equal(
      packageJson.scripts.test,
      "node scripts/check-toolcraft-docs.mjs && node scripts/check-toolcraft-integrity.mjs && node --test scripts/*.test.mjs && vitest run src --passWithNoTests",
    );
    assert.equal(
      packageJson.scripts["test:browser"],
      'playwright install chromium && playwright test --grep-invert "browser perf:"',
    );
    assert.equal(
      packageJson.scripts["test:browser:perf"],
      "playwright install chromium && playwright test --grep \"browser perf:\" --workers=1 --pass-with-no-tests",
    );
    assert.equal(packageJson.scripts["verify:quick"], "pnpm ai:check && pnpm test");
    assert.equal(packageJson.scripts["verify:ui"], "pnpm test:browser");
    assert.equal(packageJson.scripts["verify:perf"], "pnpm test:browser:perf");
    assert.equal(packageJson.scripts["verify:perf:playwright"], "pnpm test:browser:perf");
    assert.equal(
      packageJson.scripts["verify:final"],
      "pnpm ai:check && pnpm test && pnpm build && pnpm test:browser",
    );

    const indexHtmlSource = await fs.readFile(path.join(targetDir, "index.html"), "utf8");
    assert.match(indexHtmlSource, /<title>Generated App<\/title>/);
    assert.match(indexHtmlSource, /<meta name="toolcraft-app-title" content="Generated App" \/>/);

    assert.ok(await fs.stat(path.join(targetDir, "playwright.config.ts")));
    const playwrightConfigSource = await fs.readFile(
      path.join(targetDir, "playwright.config.ts"),
      "utf8",
    );
    assert.match(playwrightConfigSource, /reuseExistingServer:\s*false/);
    assert.ok(await fs.stat(path.join(targetDir, "e2e/app-browser-acceptance.spec.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "e2e/app-controls.spec.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-schema.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-schema.test.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-acceptance.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-acceptance.test.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-performance.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "src/app/app-performance.test.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "e2e/app-performance.spec.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "e2e/performance-helpers.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "e2e/product-observable-helpers.ts")));
    assert.ok(await fs.stat(path.join(targetDir, "e2e/canvas-handle-helpers.ts")));
    const gitignoreSource = await fs.readFile(path.join(targetDir, ".gitignore"), "utf8");
    assert.match(gitignoreSource, /node_modules/);
    assert.match(gitignoreSource, /dist/);
    assert.match(gitignoreSource, /playwright-report/);
    assert.match(gitignoreSource, /\.env\.\*/);
    assert.match(gitignoreSource, /\.toolcraft/);
    await assert.rejects(() => fs.stat(path.join(targetDir, "gitignore")), /ENOENT/);
    assert.ok(await fs.stat(path.join(targetDir, "scripts/check-ai-skills.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "scripts/toolcraft-port.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "scripts/toolcraft-port.test.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "scripts/check-toolcraft-docs.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "scripts/check-toolcraft-integrity.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "scripts/run-vite-on-free-port.mjs")));
    assert.ok(await fs.stat(path.join(targetDir, "LICENSE.md")));
    assert.ok(await fs.stat(path.join(targetDir, "NOTICE.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/README.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/assembly-workflow.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/decision-contract.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/schema-reference.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/acceptance-testing.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/performance.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/renderer-technique.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/custom-controls.md")));
    assert.ok(await fs.stat(path.join(targetDir, "docs/toolcraft/component-rules.md")));
    assert.ok(await fs.stat(path.join(targetDir, "src/toolcraft/.toolcraft-manifest.json")));

    const appPerformanceSource = await fs.readFile(
      path.join(targetDir, "src/app/app-performance.ts"),
      "utf8",
    );
    assert.match(appPerformanceSource, /defineToolcraftPerformance/);
    assert.match(appPerformanceSource, /preferredRunner:\s*"agent-browser"/);
    assert.match(appPerformanceSource, /fallbackRunner:\s*"playwright"/);
    assert.match(appPerformanceSource, /agent-browser-unavailable/);
    assert.doesNotMatch(appPerformanceSource, /function\s+validateToolcraftPerformanceCoverage/);
    assert.doesNotMatch(
      appPerformanceSource,
      /function\s+collectToolcraftPerformanceSensitiveControls/,
    );
    assert.doesNotMatch(appPerformanceSource, /maxPerformanceBudgetCaps/);

    await execFileAsync(process.execPath, [path.join(targetDir, "scripts/check-toolcraft-integrity.mjs")], {
      cwd: targetDir,
    });
    await execFileAsync(process.execPath, ["--check", path.join(targetDir, "scripts/toolcraft-port.mjs")], {
      cwd: targetDir,
    });
    await execFileAsync(process.execPath, ["--check", path.join(targetDir, "scripts/run-vite-on-free-port.mjs")], {
      cwd: targetDir,
    });
    await execFileAsync(process.execPath, [path.join(targetDir, "scripts/check-toolcraft-docs.mjs")], {
      cwd: targetDir,
    });

    const routePath = path.join(targetDir, "src/routes/index.tsx");
    const originalRouteSource = await fs.readFile(routePath, "utf8");
    await fs.writeFile(
      routePath,
      'export function AppHome() { return <iframe src="/reference/index.html" />; }\n',
    );
    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [path.join(targetDir, "scripts/check-toolcraft-integrity.mjs")], {
          cwd: targetDir,
        }),
      /app shell bypass: route files must not render a full-page iframe/,
    );
    await fs.writeFile(routePath, originalRouteSource);

    const copiedUiIndexPath = path.join(targetDir, "src/toolcraft/ui/index.ts");
    await fs.appendFile(copiedUiIndexPath, "\n// generated app edits should fail integrity checks\n");
    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [path.join(targetDir, "scripts/check-toolcraft-integrity.mjs")], {
          cwd: targetDir,
        }),
      /Toolcraft generated app integrity check failed/,
    );
    const agentsSource = await fs.readFile(path.join(targetDir, "AGENTS.md"), "utf8");
    const licenseSource = await fs.readFile(path.join(targetDir, "LICENSE.md"), "utf8");
    const noticeSource = await fs.readFile(path.join(targetDir, "NOTICE.md"), "utf8");
    const localDocPaths = [
      "assembly-workflow.md",
      "decision-contract.md",
      "schema-reference.md",
      "component-rules.md",
      "acceptance-testing.md",
      "performance.md",
      "renderer-technique.md",
      "custom-controls.md",
    ];

    assert.match(agentsSource, /Quick Entry Contract/);
    assert.match(agentsSource, /Local Reference Docs/);
    assert.match(agentsSource, /src\/app\/app-schema\.ts/);
    assert.match(agentsSource, /src\/app\/app-acceptance\.ts/);
    assert.match(agentsSource, /src\/app\/app-performance\.ts/);
    assert.match(agentsSource, /Required AI Workflow Skills/);
    assert.match(agentsSource, /Verification Tier Classifier/);
    assert.match(agentsSource, /Verification tier: Tier N/);
    assert.match(agentsSource, /pnpm verify:quick/);
    assert.match(agentsSource, /pnpm verify:final/);
    assert.match(agentsSource, /pnpm ai:check/);
    assert.match(agentsSource, /use `brainstorming`/);
    assert.match(agentsSource, /use `writing-plans`/);
    assert.match(agentsSource, /use `systematic-debugging`/);
    assert.match(agentsSource, /browser` workflow/);
    assert.match(agentsSource, /pnpm test:browser/);
    assert.match(agentsSource, /Do not silently skip required workflow skills/);
    assert.match(agentsSource, /Toolcraft app contract overrides generic brainstorming approval/);
    assert.match(agentsSource, /Do not ask the user to confirm decisions already covered/);
    assert.match(agentsSource, /Do not ask whether to enable a browser companion/);
    assert.match(agentsSource, /not git repositories, save spec\/plan files without asking/);
    assert.match(agentsSource, /defineToolcraft/);
    assert.match(agentsSource, /ToolcraftApp/);
    assert.match(agentsSource, /canvasContent/);
    assert.match(agentsSource, /renderDefaultCanvasMedia=\{false\}/);
    assert.match(agentsSource, /onPanelAction/);
    assert.match(agentsSource, /Toolcraft Designer License/);
    assert.match(agentsSource, /LICENSE\.md/);
    assert.match(agentsSource, /NOTICE\.md/);
    assert.match(licenseSource, /Permitted Designer Use/);
    assert.match(licenseSource, /designer client work/);
    assert.match(licenseSource, /AI-Assisted Development/);
    assert.match(licenseSource, /Codex, Claude, ChatGPT, Cursor/);
    assert.match(licenseSource, /does not, by itself, make your use a prohibited AI software/);
    assert.match(licenseSource, /Prohibited Uses/);
    assert.match(licenseSource, /paid AI software/);
    assert.match(licenseSource, /template marketplaces/);
    assert.match(noticeSource, /generated with Toolcraft/);
    assert.match(noticeSource, /governed by `LICENSE\.md`/);

    for (const localDocPath of localDocPaths) {
      assert.match(agentsSource, new RegExp(`docs/toolcraft/${localDocPath.replace(".", "\\.")}`));
    }

    const componentRulesSource = await fs.readFile(
      path.join(targetDir, "docs/toolcraft/component-rules.md"),
      "utf8",
    );
    assert.match(componentRulesSource, /Slider `step` means numeric snapping only/);
    assert.match(componentRulesSource, /variant: "discrete"/);
    assert.match(componentRulesSource, /Keep large or precision stepped ranges visually continuous/);
    assert.match(componentRulesSource, /Segmented Controls/);
    assert.match(componentRulesSource, /Never generate a section titled `Color` or `Colors`/);
    assert.match(componentRulesSource, /Use `fileDrop` for source material uploads/);
    assert.match(componentRulesSource, /Do not show Layers for a single-layer app/);
    assert.match(componentRulesSource, /Use playback timeline/);
    assert.match(componentRulesSource, /Still-output product apps include one primary `Export PNG` action/);
    assert.match(componentRulesSource, /Animated product apps include `Export Video`/);
    assert.match(componentRulesSource, /Copy never replaces export/);

    const assemblyDocsSource = await fs.readFile(
      path.join(targetDir, "docs/toolcraft/assembly-workflow.md"),
      "utf8",
    );
    assert.match(assemblyDocsSource, /@\/toolcraft\/runtime/);
    assert.match(assemblyDocsSource, /transferMode: "reference-runtime-clone"/);
    assert.match(assemblyDocsSource, /`canvasContent` must not contain app UI/);
    assert.doesNotMatch(assemblyDocsSource, /@repo\/toolcraft-runtime/);

    const acceptanceDocsSource = await fs.readFile(
      path.join(targetDir, "docs/toolcraft/acceptance-testing.md"),
      "utf8",
    );
    assert.match(acceptanceDocsSource, /Every visible product entity must prove it works/);
    assert.match(acceptanceDocsSource, /automatedTestName/);
    assert.match(acceptanceDocsSource, /browserTestName/);

    const rendererDocsSource = await fs.readFile(
      path.join(targetDir, "docs/toolcraft/renderer-technique.md"),
      "utf8",
    );
    assert.match(rendererDocsSource, /rendererTechnique/);
    assert.match(rendererDocsSource, /sourceRepresentation/);
    assert.match(rendererDocsSource, /whyNotAlternativeStrategies/);
    await assert.rejects(
      () =>
        fs.stat(path.join(targetDir, "src/toolcraft/runtime/react/canvas-shell.test.tsx")),
      /ENOENT/,
    );

    const routeSource = await fs.readFile(path.join(targetDir, "src/routes/index.tsx"), "utf8");
    assert.match(routeSource, /@\/toolcraft\/runtime\/react/);
    assert.match(routeSource, /\.\.\/app\/app-schema/);

    const stylesSource = await fs.readFile(path.join(targetDir, "src/styles.css"), "utf8");
    assert.match(stylesSource, /@source "\.\/toolcraft\/ui";/);
    assert.match(stylesSource, /@import "@\/toolcraft\/ui\/styles\.css";/);

    const allText = await readTextFiles(targetDir);
    assert.doesNotMatch(allText, /@repo\/ui|@repo\/toolcraft-runtime|workspace:/);
    assert.doesNotMatch(allText, new RegExp("template" + "-runtime"));
    assert.doesNotMatch(allText, /packages\/typescript-config/);
    assert.doesNotMatch(
      allText,
      /starterSchema|starter-schema|starterAcceptance|starter-acceptance|starterProductReadiness|starterTransferMode|starterPerformance|starter-performance|StarterHome|Toolcraft Starter/,
    );
  });

  it("refuses to write into a non-empty directory without force", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-cli-"));
    tempRoots.push(tempRoot);
    await fs.writeFile(path.join(tempRoot, "README.md"), "keep me");

    await assert.rejects(
      () =>
        generateToolcraft({
          cwd: tempRoot,
        }),
      /Target directory is not empty/,
    );
  });

  it("writes the app identity marker when the generated title matches the template title", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-cli-"));
    tempRoots.push(tempRoot);

    await generateToolcraft({
      cwd: tempRoot,
      force: true,
      name: "toolcraft-app-template",
      targetDir: "toolcraft-app-template",
    });

    const indexHtmlSource = await fs.readFile(
      path.join(tempRoot, "toolcraft-app-template", "index.html"),
      "utf8",
    );

    assert.match(indexHtmlSource, /<title>Toolcraft App Template<\/title>/);
    assert.match(
      indexHtmlSource,
      /<meta name="toolcraft-app-title" content="Toolcraft App Template" \/>/,
    );
  });
});
