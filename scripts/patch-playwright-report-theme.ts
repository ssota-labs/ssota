#!/usr/bin/env tsx
/**
 * Patch Playwright HTML reports for readable tag colors (force light theme).
 * Playwright follows prefers-color-scheme:dark; semi-transparent label chips look broken.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MARKER = "ssota-billing-report-theme";

const INJECT_HEAD = `<style id="${MARKER}">
/* SSOTA: force light Playwright report — tag chips stay readable */
html { color-scheme: light only !important; }
html, body { background: #ffffff !important; color: #1f2328 !important; }
html.light-mode, html.dark-mode, :root.light-mode, :root.dark-mode {
  color-scheme: light only !important;
}
/* Opaque label chips (Playwright uses GitHub primer scale vars) */
.label-color-0 { background-color: #ddf4ff !important; color: #0969da !important; border: 1px solid #54aeff !important; opacity: 1 !important; }
.label-color-1 { background-color: #fff8c5 !important; color: #9a6700 !important; border: 1px solid #d4a72c !important; opacity: 1 !important; }
.label-color-2 { background-color: #fbefff !important; color: #8250df !important; border: 1px solid #c297ff !important; opacity: 1 !important; }
.label-color-3 { background-color: #ffeff7 !important; color: #bf3989 !important; border: 1px solid #ff9bce !important; opacity: 1 !important; }
.label-color-4 { background-color: #fff0eb !important; color: #bc4c00 !important; border: 1px solid #ffa28b !important; opacity: 1 !important; }
.label-color-5 { background-color: #fff1e5 !important; color: #bc4c00 !important; border: 1px solid #ffa657 !important; opacity: 1 !important; }
.label { opacity: 1 !important; filter: none !important; }
.subnav-item-label, .chip-header, .test-file-title { color: #1f2328 !important; }
</style>
<script id="${MARKER}-boot">
(function () {
  try { localStorage.setItem('theme', 'light-mode'); } catch (_) {}
  var root = document.documentElement;
  root.classList.remove('dark-mode');
  root.classList.add('light-mode');
})();
</script>`;

const INJECT_TAIL = `<style id="${MARKER}-tail">
@media (prefers-color-scheme: dark) {
  html, body { background: #ffffff !important; color: #1f2328 !important; }
}
</style>`;

const root = join(import.meta.dirname, "..", "e2e", "report");
const targets = [
  join(root, "billing-oss-html", "index.html"),
  join(root, "billing-stripe-html", "index.html"),
  join(root, "html", "index.html"),
];

function stripPreviousPatch(html: string): string {
  return html
    .replace(new RegExp(`<style id="${MARKER}"[\\s\\S]*?</style>\\s*`, "g"), "")
    .replace(new RegExp(`<script id="${MARKER}-boot"[\\s\\S]*?</script>\\s*`, "g"), "")
    .replace(new RegExp(`<style id="${MARKER}-tail"[\\s\\S]*?</style>\\s*`, "g"), "");
}

let patched = 0;
for (const file of targets) {
  try {
    let html = readFileSync(file, "utf8");
    html = stripPreviousPatch(html);

    if (!html.includes("<head>")) {
      console.warn(`skip (no <head>): ${file}`);
      continue;
    }

    html = html.replace(
      "<meta name='color-scheme' content='dark light'>",
      "<meta name='color-scheme' content='light'>",
    );
    html = html.replace(
      '<meta name="color-scheme" content="dark light">',
      '<meta name="color-scheme" content="light">',
    );

    html = html.replace("<head>", `<head>\n${INJECT_HEAD}`);
    html = html.replace("</head>", `${INJECT_TAIL}\n</head>`);

    writeFileSync(file, html);
    console.log(`patched: ${file}`);
    patched++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`skip ${file}: ${message}`);
  }
}

console.log(`Done. Patched ${patched} report(s).`);
