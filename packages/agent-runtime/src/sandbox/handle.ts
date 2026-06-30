import type { SandboxExecResult, SandboxHandle } from "@ssota/core";
import { resolvePathWithinRoots } from "./path-policy.js";
import type { RawSandbox } from "./vercel-client.js";

export function createSandboxHandle(input: {
  sessionId: string;
  vercelSandboxId: string;
  raw: RawSandbox;
  workingDirectory: string;
  allowedRoots: readonly string[];
}): SandboxHandle {
  const { sessionId, vercelSandboxId, raw, workingDirectory, allowedRoots } =
    input;

  return {
    sessionId,
    vercelSandboxId,
    workingDirectory,
    allowedRoots,

    async exec(cmd, args = [], options = {}) {
      const cwd = options.cwd
        ? resolvePathWithinRoots(options.cwd, allowedRoots, workingDirectory)
        : workingDirectory;
      const result = await raw.runCommand({
        cmd,
        args,
        cwd,
        env: options.env,
      });
      const stdout = result.stdout ? await result.stdout() : "";
      const stderr = result.stderr ? await result.stderr() : "";
      const execResult: SandboxExecResult = {
        exitCode: result.exitCode,
        stdout: stdout.slice(0, 20_000),
        stderr: stderr.slice(0, 20_000),
      };
      return execResult;
    },

    async readFile(path, options = {}) {
      const resolved = resolvePathWithinRoots(
        path,
        allowedRoots,
        workingDirectory,
      );
      if (!raw.readFile) throw new Error("Sandbox readFile API unavailable");
      const bytes = await raw.readFile(resolved);
      const content =
        typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes);
      const offset = options.offset ?? 0;
      const limit = options.limit ?? 50_000;
      return content.slice(offset, offset + limit);
    },

    async writeFile(path, content) {
      const resolved = resolvePathWithinRoots(
        path,
        allowedRoots,
        workingDirectory,
      );
      if (!raw.writeFile) throw new Error("Sandbox writeFile API unavailable");
      await raw.writeFile(resolved, content);
    },

    async deleteFile(path) {
      const resolved = resolvePathWithinRoots(
        path,
        allowedRoots,
        workingDirectory,
      );
      await raw.runCommand({ cmd: "rm", args: ["-f", resolved] });
    },

    async snapshot() {
      if (!raw.snapshot) return null;
      const snap = await raw.snapshot();
      return typeof snap === "string" ? snap : (snap.snapshotId ?? null);
    },

    async stop() {
      await raw.stop();
    },
  };
}
