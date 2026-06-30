import { randomUUID } from "node:crypto";
import { tool, type ToolSet } from "ai";
import {
  SandboxAwaitInputSchema,
  SandboxDeleteInputSchema,
  SandboxGlobInputSchema,
  SandboxGrepInputSchema,
  SandboxReadInputSchema,
  SandboxReadLintsInputSchema,
  SandboxShellInputSchema,
  SandboxStrReplaceInputSchema,
  SandboxWriteInputSchema,
  SANDBOX_TOOLS_BY_ACCESS_TIER,
  type SandboxAccessTier,
  type SandboxPrimitiveToolName,
} from "@ssota/contracts";
import type { SandboxHandle } from "@ssota/core";
import { SandboxPathPolicyError } from "../sandbox/path-policy.js";
import { getSandbox } from "./context.js";

function pathPolicyError(error: unknown) {
  if (error instanceof SandboxPathPolicyError) {
    return { ok: false, error: error.message };
  }
  throw error;
}

async function runDetachedShell(
  handle: SandboxHandle,
  input: {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
  },
): Promise<{ handle: string }> {
  const handleId = randomUUID();
  const logPath = `/tmp/ssota-await-${handleId}.log`;
  const pidPath = `/tmp/ssota-await-${handleId}.pid`;
  const script = [
    `cd ${input.cwd ?? handle.workingDirectory}`,
    `nohup ${[input.cmd, ...input.args].map((a) => JSON.stringify(a)).join(" ")} > ${JSON.stringify(logPath)} 2>&1 & echo $! > ${JSON.stringify(pidPath)}`,
  ].join(" && ");
  const result = await handle.exec("bash", ["-lc", script], {
    env: input.env,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to start detached command: ${result.stderr || result.stdout}`,
    );
  }
  return { handle: handleId };
}

/**
 * Sandbox primitive tools for dev-capable runs. Only attached when the run
 * provisioned a sandbox session; the agent stays outside the VM.
 */
export function createSandboxTools(): ToolSet {
  const tools: ToolSet = {
    sandbox_shell: tool({
      description:
        "Run a shell command inside the sandbox VM. Use detached mode for long-running processes.",
      inputSchema: SandboxShellInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          if (input.mode === "detached") {
            return await runDetachedShell(handle, {
              cmd: input.cmd,
              args: input.args,
              cwd: input.cwd,
              env: input.env,
            });
          }
          const result = await handle.exec(input.cmd, input.args, {
            cwd: input.cwd,
            timeoutMs: input.timeoutMs,
            env: input.env,
          });
          return {
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_await: tool({
      description:
        "Wait for a detached sandbox_shell process and return its output.",
      inputSchema: SandboxAwaitInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        const logPath = `/tmp/ssota-await-${input.handle}.log`;
        const pidPath = `/tmp/ssota-await-${input.handle}.pid`;
        const timeoutMs = input.timeoutMs ?? 60_000;
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
          const pidCheck = await handle.exec("test", ["-f", pidPath]);
          if (pidCheck.exitCode !== 0) {
            return { ok: false, error: `Unknown handle: ${input.handle}` };
          }
          const running = await handle.exec("bash", [
            "-lc",
            `kill -0 $(cat ${pidPath}) 2>/dev/null`,
          ]);
          if (running.exitCode !== 0) {
            const content = await handle.readFile(logPath);
            if (input.pattern) {
              const regex = new RegExp(input.pattern, "m");
              const match = content.match(regex);
              return {
                ok: true,
                done: true,
                matched: Boolean(match),
                output: match?.[0] ?? content.slice(0, 20_000),
              };
            }
            return { ok: true, done: true, output: content.slice(0, 20_000) };
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        return { ok: true, done: false, error: "Timeout waiting for process" };
      },
    }),

    sandbox_read: tool({
      description: "Read a UTF-8 file from the sandbox.",
      inputSchema: SandboxReadInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          const content = await handle.readFile(input.path, {
            offset: input.offset,
            limit: input.limit,
          });
          return { ok: true, content };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_write: tool({
      description: "Write a file in the sandbox (creates or overwrites).",
      inputSchema: SandboxWriteInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          await handle.writeFile(input.path, input.content);
          return { ok: true, path: input.path };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_str_replace: tool({
      description: "Replace a unique string inside a sandbox file.",
      inputSchema: SandboxStrReplaceInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          const content = await handle.readFile(input.path);
          if (!content.includes(input.oldString)) {
            return { ok: false, error: "oldString not found in file" };
          }
          const occurrences = content.split(input.oldString).length - 1;
          if (occurrences > 1) {
            return {
              ok: false,
              error: `oldString appears ${occurrences} times; must be unique`,
            };
          }
          await handle.writeFile(
            input.path,
            content.replace(input.oldString, input.newString),
          );
          return { ok: true, path: input.path };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_delete: tool({
      description: "Delete a file in the sandbox.",
      inputSchema: SandboxDeleteInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          await handle.deleteFile(input.path);
          return { ok: true, path: input.path };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_glob: tool({
      description: "Find files in the sandbox matching a glob pattern.",
      inputSchema: SandboxGlobInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          const cwd = input.cwd ?? handle.workingDirectory;
          const result = await handle.exec("bash", [
            "-lc",
            `find ${JSON.stringify(cwd)} -path ${JSON.stringify(`${cwd}/${input.pattern}`)} -type f 2>/dev/null | head -200`,
          ]);
          const files = result.stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          return { ok: true, files };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_grep: tool({
      description: "Search file contents in the sandbox with ripgrep or grep.",
      inputSchema: SandboxGrepInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        try {
          const searchPath = input.path ?? handle.workingDirectory;
          const args = ["-n", input.pattern, searchPath];
          if (input.glob) args.push("--glob", input.glob);
          let result = await handle.exec("rg", args);
          if (result.exitCode === 127) {
            result = await handle.exec("grep", [
              "-rn",
              input.pattern,
              searchPath,
            ]);
          }
          return {
            ok: true,
            matches: result.stdout.slice(0, 20_000),
            exitCode: result.exitCode,
          };
        } catch (error) {
          return pathPolicyError(error);
        }
      },
    }),

    sandbox_read_lints: tool({
      description:
        "Run a lightweight lint check on paths in the sandbox (best-effort).",
      inputSchema: SandboxReadLintsInputSchema,
      execute: async (input, { context }) => {
        const handle = getSandbox(context);
        const paths = input.paths?.length
          ? input.paths.join(" ")
          : handle.workingDirectory;
        const result = await handle.exec("bash", [
          "-lc",
          `if command -v eslint >/dev/null 2>&1; then eslint ${paths} -f json 2>/dev/null || true; else echo '[]'; fi`,
        ]);
        try {
          const diagnostics = JSON.parse(result.stdout || "[]");
          return { ok: true, diagnostics };
        } catch {
          return { ok: true, diagnostics: [], raw: result.stdout.slice(0, 5000) };
        }
      },
    }),
  };

  return tools;
}

export const SANDBOX_PRIMITIVE_TOOL_NAMES: SandboxPrimitiveToolName[] = [
  "sandbox_shell",
  "sandbox_await",
  "sandbox_read",
  "sandbox_write",
  "sandbox_str_replace",
  "sandbox_delete",
  "sandbox_glob",
  "sandbox_grep",
  "sandbox_read_lints",
];

/** Filter sandbox tools by access tier. */
export function pickSandboxToolsByTier(tier: SandboxAccessTier): ToolSet {
  if (tier === "none") return {};
  const all = createSandboxTools();
  const allowed = new Set(SANDBOX_TOOLS_BY_ACCESS_TIER[tier]);
  const out: ToolSet = {};
  for (const name of allowed) {
    if (all[name]) out[name] = all[name];
  }
  return out;
}
