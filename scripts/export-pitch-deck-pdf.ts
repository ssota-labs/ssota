import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const requireFromE2e = createRequire(new URL("../e2e/package.json", import.meta.url));
const { chromium } = requireFromE2e("@playwright/test") as typeof import("@playwright/test");

type ExportOptions = {
  url: string;
  out: string;
};

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function readOptions(): ExportOptions {
  return {
    url: readArg("url") ?? "http://localhost:3000/labs/pitch-deck",
    out:
      readArg("out") ??
      "/opt/cursor/artifacts/pax-humana-ssota-pitch-deck.pdf",
  };
}

async function main() {
  const options = readOptions();
  const outPath = resolve(options.out);

  await mkdir(dirname(outPath), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(options.url, { waitUntil: "networkidle" });
    await page.locator('[data-testid="pitch-slide-14"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: true,
      width: "13.333in",
      height: "7.5in",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }

  console.log(`Exported pitch deck PDF: ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
