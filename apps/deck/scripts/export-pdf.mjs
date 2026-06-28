// SSOTA Investor Deck → PDF 추출기
// 빌드된 deck 앱(/print)을 Playwright Chromium 으로 열어 16:9 PDF 로 저장한다.
//
// 사용법:
//   pnpm --filter deck build
//   pnpm --filter deck export:pdf            # ./out/ssota-deck.pdf 생성
//
// 옵션(환경변수):
//   DECK_URL   이미 떠 있는 서버 주소 (예: http://127.0.0.1:6008). 없으면 next start 를 자동 기동.
//   OUT        출력 경로 (기본 out/ssota-deck.pdf)
//   PORT       자동 기동 포트 (기본 6008)

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "..");
const PORT = Number(process.env.PORT ?? 6008);
const OUT = resolve(appDir, process.env.OUT ?? "out/ssota-deck.pdf");

function canConnect(port, host = "127.0.0.1") {
  return new Promise((res) => {
    const sock = net.connect(port, host);
    sock.once("connect", () => {
      sock.destroy();
      res(true);
    });
    sock.once("error", () => res(false));
    setTimeout(() => {
      sock.destroy();
      res(false);
    }, 800);
  });
}

async function waitForPort(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canConnect(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  let baseUrl = process.env.DECK_URL ?? "";
  let server;

  if (!baseUrl) {
    baseUrl = `http://127.0.0.1:${PORT}`;
    if (!(await canConnect(PORT))) {
      console.log(`[deck] next start --port ${PORT} 기동…`);
      server = spawn("pnpm", ["exec", "next", "start", "--port", String(PORT)], {
        cwd: appDir,
        stdio: "inherit",
      });
      const ok = await waitForPort(PORT);
      if (!ok) throw new Error("deck 서버 기동 실패 — 먼저 `pnpm --filter deck build` 했는지 확인하세요.");
    }
  }

  await mkdir(dirname(OUT), { recursive: true });

  console.log(`[deck] 렌더링: ${baseUrl}/print`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/print`, { waitUntil: "networkidle" });
  // 웹폰트/레이아웃 안정화 대기
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);

  await page.pdf({
    path: OUT,
    width: "1280px",
    height: "720px",
    printBackground: true,
    preferCSSPageSize: true,
  });

  await browser.close();
  if (server) server.kill();
  console.log(`[deck] ✅ 저장: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
