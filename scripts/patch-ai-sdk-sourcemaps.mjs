#!/usr/bin/env node
/**
 * Strip sourceMappingURL comments from @ai-sdk dist files.
 *
 * Turbopack/SWC logs ERROR when it cannot resolve these maps in pnpm layouts.
 * We patch every pnpm store copy because transitive deps may pin older versions.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PNPM_DIR = path.join(ROOT, "node_modules/.pnpm");

const TARGETS = [
  {
    prefix: "@ai-sdk+provider-utils@",
    rel: "node_modules/@ai-sdk/provider-utils/dist/index.js",
  },
  {
    prefix: "@ai-sdk+workflow@",
    rel: "node_modules/@ai-sdk/workflow/dist/index.mjs",
  },
];

function stripSourceMappingUrl(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const next = content.replace(/\/\/# sourceMappingURL=.*$/gm, "");
  if (next === content) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

let patched = 0;

if (fs.existsSync(PNPM_DIR)) {
  for (const entry of fs.readdirSync(PNPM_DIR)) {
    for (const { prefix, rel } of TARGETS) {
      if (!entry.startsWith(prefix)) continue;
      const filePath = path.join(PNPM_DIR, entry, rel);
      if (!fs.existsSync(filePath)) continue;
      if (stripSourceMappingUrl(filePath)) {
        patched += 1;
        console.log(`[patch-ai-sdk-sourcemaps] ${path.relative(ROOT, filePath)}`);
      }
    }
  }
}

if (patched > 0) {
  console.log(`[patch-ai-sdk-sourcemaps] patched ${patched} file(s)`);
}
