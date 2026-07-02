import fs from "node:fs/promises";
import path from "node:path";

import { TOOLCRAFT_IMPORT_REWRITES } from "./import-map.mjs";

const TEXT_FILE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".json",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const IGNORED_DIRECTORY_NAMES = new Set([".git", "dist", "node_modules"]);

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteImportSpecifiers(source, importMap = TOOLCRAFT_IMPORT_REWRITES) {
  let output = source;

  for (const [from, to] of importMap) {
    const exactQuotedSpecifier = new RegExp(`(["'])${escapeRegExp(from)}\\1`, "g");
    output = output.replace(exactQuotedSpecifier, (_match, quote) => `${quote}${to}${quote}`);
  }

  return output;
}

export function rewriteStarterCssSources(source) {
  return source
    .replaceAll('@source "../../packages/ui/src";', '@source "./toolcraft/ui";')
    .replaceAll(
      '@source "../../packages/toolcraft-runtime/src";',
      '@source "./toolcraft/runtime";',
    );
}

export function rewriteGeneratedText(source) {
  return rewriteStarterCssSources(rewriteImportSpecifiers(source));
}

export function isTextFile(filePath) {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath));
}

export async function rewriteTextFiles(rootDir, transform = rewriteGeneratedText) {
  const changedFiles = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          await visit(filePath);
        }
        continue;
      }

      if (!entry.isFile() || !isTextFile(filePath)) {
        continue;
      }

      const current = await fs.readFile(filePath, "utf8");
      const next = transform(current, filePath);

      if (next !== current) {
        await fs.writeFile(filePath, next);
        changedFiles.push(filePath);
      }
    }
  }

  await visit(rootDir);
  return changedFiles;
}
