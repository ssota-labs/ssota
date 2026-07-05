import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RawSandbox } from "./vercel-client.js";

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * Local dev fallback when Vercel Sandbox credentials / OIDC are unavailable.
 * Uses the host filesystem under allowed roots (e.g. /tmp) and `node` subprocesses.
 */
export function createLocalRawSandbox(): RawSandbox {
  return {
    sandboxId: "local-ephemeral",
    async writeFile(filePath, body) {
      await ensureParentDir(filePath);
      await writeFile(filePath, body, "utf8");
    },
    async readFile(filePath) {
      return readFile(filePath);
    },
    async runCommand({ cmd, args = [], cwd, env }) {
      const executable = cmd === "node" ? process.execPath : cmd;
      return await new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
          cwd,
          env: { ...process.env, ...env },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk: Buffer | string) => {
          stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (exitCode) => {
          resolve({
            exitCode: exitCode ?? 1,
            stdout: async () => stdout,
            stderr: async () => stderr,
          });
        });
      });
    },
    async stop() {
      // Ephemeral /tmp files are left for the OS; no remote sandbox to tear down.
    },
  };
}
