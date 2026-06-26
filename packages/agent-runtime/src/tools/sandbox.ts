import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { getSandbox } from "./context.js";

/**
 * Sandbox tools for dev-capable runs. Only attached when the run provisioned a
 * sandbox (see `runAgentForTask({ sandbox })`); the agent stays outside the
 * VM and drives it through these tools. Reuse `@ssota/studio-sandbox`'s
 * `runStudioBuild` for component/theme builds via `sandbox_exec`.
 */
export function createSandboxTools(): ToolSet {
  return {
    sandbox_exec: tool({
      description:
        "Run a shell command inside the sandbox VM and return exit code, stdout, stderr.",
      inputSchema: z.object({
        cmd: z.string().describe("Executable, e.g. 'pnpm', 'git', 'bash'."),
        args: z.array(z.string()).optional().describe("Arguments."),
      }),
      execute: async (input, { context }) => {
        const sandbox = getSandbox(context);
        const result = await sandbox.exec(input.cmd, input.args ?? []);
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, 20_000),
          stderr: result.stderr.slice(0, 20_000),
        };
      },
    }),

    sandbox_write_file: tool({
      description: "Write a file in the sandbox (creates or overwrites).",
      inputSchema: z.object({
        path: z.string().describe("Sandbox path."),
        content: z.string(),
      }),
      execute: async (input, { context }) => {
        const sandbox = getSandbox(context);
        await sandbox.writeFile(input.path, input.content);
        return { ok: true, path: input.path };
      },
    }),

    sandbox_read_file: tool({
      description: "Read a UTF-8 file from the sandbox.",
      inputSchema: z.object({ path: z.string() }),
      execute: async (input, { context }) => {
        const sandbox = getSandbox(context);
        try {
          const content = await sandbox.readFile(input.path);
          return { ok: true, content: content.slice(0, 50_000) };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
