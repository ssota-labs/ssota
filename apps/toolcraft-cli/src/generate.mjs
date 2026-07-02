import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertDirectory,
  copyDirectory,
  ensureWritableTargetDirectory,
  pathExists,
  removeDirectory,
} from "./copy-recursive.mjs";
import {
  createGeneratedPackageJson,
  createGeneratedTsConfig,
  normalizeProjectTitle,
} from "./package-json.mjs";
import { rewriteGeneratedText, rewriteTextFiles } from "./rewrite-imports.mjs";

const PACKAGE_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function writeJson(filePath, value) {
  return fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function escapeHtmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value) {
  return escapeHtmlText(value).replaceAll('"', "&quot;");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function createRelativePath(fromDir, toDir) {
  const relativePath = path.relative(fromDir, toDir);
  return relativePath === "" ? "." : relativePath;
}

function rewriteGeneratedAppText(source) {
  return rewriteGeneratedText(source)
    .replaceAll("starterAcceptance", "appAcceptance")
    .replaceAll("starter-acceptance", "app-acceptance")
    .replaceAll("starterProductReadiness", "appProductReadiness")
    .replaceAll("starterTransferMode", "appTransferMode")
    .replaceAll("starterPerformance", "appPerformance")
    .replaceAll("starter-performance", "app-performance")
    .replaceAll("starterSchema", "appSchema")
    .replaceAll("starter-schema", "app-schema")
    .replaceAll("StarterHome", "AppHome")
    .replaceAll("Toolcraft Starter", "Toolcraft App Template");
}

async function renameGeneratedAppFiles(targetDir) {
  const starterSchemaPath = path.join(targetDir, "src/app/starter-schema.ts");
  const appSchemaPath = path.join(targetDir, "src/app/app-schema.ts");
  const starterSchemaTestPath = path.join(targetDir, "src/app/starter-schema.test.ts");
  const appSchemaTestPath = path.join(targetDir, "src/app/app-schema.test.ts");
  const starterAcceptancePath = path.join(targetDir, "src/app/starter-acceptance.ts");
  const appAcceptancePath = path.join(targetDir, "src/app/app-acceptance.ts");
  const starterAcceptanceTestPath = path.join(targetDir, "src/app/starter-acceptance.test.ts");
  const appAcceptanceTestPath = path.join(targetDir, "src/app/app-acceptance.test.ts");
  const starterPerformancePath = path.join(targetDir, "src/app/starter-performance.ts");
  const appPerformancePath = path.join(targetDir, "src/app/app-performance.ts");
  const starterPerformanceTestPath = path.join(targetDir, "src/app/starter-performance.test.ts");
  const appPerformanceTestPath = path.join(targetDir, "src/app/app-performance.test.ts");

  if (await pathExists(starterSchemaPath)) {
    await fs.rename(starterSchemaPath, appSchemaPath);
  }

  if (await pathExists(starterSchemaTestPath)) {
    await fs.rename(starterSchemaTestPath, appSchemaTestPath);
  }

  if (await pathExists(starterAcceptancePath)) {
    await fs.rename(starterAcceptancePath, appAcceptancePath);
  }

  if (await pathExists(starterAcceptanceTestPath)) {
    await fs.rename(starterAcceptanceTestPath, appAcceptanceTestPath);
  }

  if (await pathExists(starterPerformancePath)) {
    await fs.rename(starterPerformancePath, appPerformancePath);
  }

  if (await pathExists(starterPerformanceTestPath)) {
    await fs.rename(starterPerformanceTestPath, appPerformanceTestPath);
  }
}

async function restoreGeneratedGitignore(targetDir) {
  const npmSafeGitignorePath = path.join(targetDir, "gitignore");
  const gitignorePath = path.join(targetDir, ".gitignore");

  if (!(await pathExists(npmSafeGitignorePath))) {
    return;
  }

  await fs.rm(gitignorePath, { force: true });
  await fs.rename(npmSafeGitignorePath, gitignorePath);
}

async function writeGeneratedProjectTitle(targetDir, title) {
  const indexPath = path.join(targetDir, "index.html");
  const source = await fs.readFile(indexPath, "utf8");
  const escapedTitle = escapeHtmlText(title);
  const escapedTitleAttribute = escapeHtmlAttribute(title);
  const withTitle = source.replace(/<title>.*?<\/title>/, `<title>${escapedTitle}</title>`);
  const identityMeta = `<meta name="toolcraft-app-title" content="${escapedTitleAttribute}" />`;
  const identityMetaPattern = /<meta\b(?=[^>]*\bname=["']toolcraft-app-title["'])[^>]*>/i;
  const nextSource = identityMetaPattern.test(withTitle)
    ? withTitle.replace(identityMetaPattern, identityMeta)
    : withTitle.replace(/<head>/i, `<head>\n    ${identityMeta}`);

  if (!nextSource.includes(`<title>${escapedTitle}</title>`) || !nextSource.includes(identityMeta)) {
    throw new Error(`Unable to update generated app title in ${indexPath}.`);
  }

  await fs.writeFile(indexPath, nextSource);
}

async function removeToolcraftTestFiles(toolcraftRoot) {
  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await visit(filePath);
        continue;
      }

      if (entry.isFile() && /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
        await fs.rm(filePath);
      }
    }
  }

  await visit(toolcraftRoot);
}

async function writeToolcraftIntegrityManifest(toolcraftRoot) {
  const files = {};

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await visit(filePath);
        continue;
      }

      if (entry.isFile() && entry.name !== ".toolcraft-manifest.json") {
        const relativePath = path.relative(toolcraftRoot, filePath).split(path.sep).join("/");
        files[relativePath] = await hashFile(filePath);
      }
    }
  }

  await visit(toolcraftRoot);
  await writeJson(path.join(toolcraftRoot, ".toolcraft-manifest.json"), {
    description:
      "Integrity manifest for copied Toolcraft sources. Generated apps should not edit src/toolcraft.",
    files: Object.fromEntries(
      Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
    ),
    version: 1,
  });
}

function allDirectoriesExist(paths) {
  return Object.values(paths).every((directoryPath) => {
    try {
      return fsSync.statSync(directoryPath).isDirectory();
    } catch {
      return false;
    }
  });
}

export function getDefaultSourcePaths(repoRoot = REPO_ROOT) {
  const monorepoPaths = {
    toolcraftSrc: path.join(repoRoot, "packages/toolcraft-runtime/src"),
    starterDir: path.join(repoRoot, "starter"),
    uiSrc: path.join(repoRoot, "packages/ui/src"),
  };

  if (allDirectoriesExist(monorepoPaths)) {
    return monorepoPaths;
  }

  return {
    toolcraftSrc: path.join(PACKAGE_ROOT, "templates/runtime"),
    starterDir: path.join(PACKAGE_ROOT, "templates/starter"),
    uiSrc: path.join(PACKAGE_ROOT, "templates/ui"),
  };
}

export async function generateToolcraft(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const targetDir = path.resolve(cwd, options.targetDir ?? ".");
  const sourcePaths = options.sourcePaths ?? getDefaultSourcePaths(options.repoRoot ?? REPO_ROOT);

  await assertDirectory(sourcePaths.starterDir, "Starter app");
  await assertDirectory(sourcePaths.uiSrc, "UI package source");
  await assertDirectory(sourcePaths.toolcraftSrc, "Toolcraft template runtime package source");
  const starterPackageJson = await readJson(path.join(sourcePaths.starterDir, "package.json"));
  const packageJson = createGeneratedPackageJson({
    name: options.name ?? path.basename(targetDir),
    starterPackageJson,
  });
  const projectTitle = normalizeProjectTitle(packageJson.name);

  await ensureWritableTargetDirectory(targetDir, { force: options.force });

  await copyDirectory(sourcePaths.starterDir, targetDir);
  await restoreGeneratedGitignore(targetDir);
  await renameGeneratedAppFiles(targetDir);

  const toolcraftRoot = path.join(targetDir, "src/toolcraft");
  await removeDirectory(toolcraftRoot);
  await fs.mkdir(toolcraftRoot, { recursive: true });
  await copyDirectory(sourcePaths.uiSrc, path.join(toolcraftRoot, "ui"));
  await copyDirectory(sourcePaths.toolcraftSrc, path.join(toolcraftRoot, "runtime"));
  await removeToolcraftTestFiles(toolcraftRoot);

  const changedFiles = await rewriteTextFiles(targetDir, (source) =>
    rewriteGeneratedAppText(source),
  );
  await writeGeneratedProjectTitle(targetDir, projectTitle);
  await writeToolcraftIntegrityManifest(toolcraftRoot);

  await writeJson(path.join(targetDir, "package.json"), packageJson);
  await writeJson(path.join(targetDir, "tsconfig.json"), createGeneratedTsConfig());
  await fs.rm(path.join(targetDir, "pnpm-lock.yaml"), { force: true });

  return {
    changedFiles,
    packageName: packageJson.name,
    relativeTargetDir: createRelativePath(cwd, targetDir),
    targetDir,
  };
}
