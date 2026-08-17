import { describe, expect, it } from "vitest";
import {
  SandboxEnvironmentSchema,
  SandboxShellInputSchema,
  SandboxReadInputSchema,
  SANDBOX_PRIMITIVE_TOOL_NAMES,
  SANDBOX_TOOLS_BY_ACCESS_TIER,
  UpsertSandboxEnvironmentInputSchema,
} from "./sandbox-environment.js";

describe("sandbox environment contracts", () => {
  it("parses a sandbox environment", () => {
    const env = SandboxEnvironmentSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      teamspaceId: "00000000-0000-4000-8000-000000000002",
      accountId: null,
      key: "sandbox.dev_node24",
      name: "Dev Node 24",
      description: "Default dev sandbox",
      runtime: "node24",
      workingRoot: "/vercel/sandbox",
      primarySourceKey: "app",
      setupScript: "pnpm install",
      envPolicy: { allowedKeys: [], networkEgress: true },
      ports: [3000],
      baseSnapshotId: null,
      latestProjectSnapshotId: null,
      persistencePolicy: { namedSandbox: true, snapshotOnSetup: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(env.key).toBe("sandbox.dev_node24");
  });

  it("parses upsert input with sources", () => {
    const input = UpsertSandboxEnvironmentInputSchema.parse({
      key: "sandbox.dev_node24",
      name: "Dev",
      sources: [
        {
          key: "app",
          url: "https://github.com/org/app",
          path: "/vercel/sandbox/app",
          primary: true,
        },
      ],
    });
    expect(input.sources).toHaveLength(1);
  });

  it("defines nine primitive tool names", () => {
    expect(SANDBOX_PRIMITIVE_TOOL_NAMES).toHaveLength(9);
    expect(SANDBOX_PRIMITIVE_TOOL_NAMES).toContain("sandbox_shell");
  });

  it("maps inspect tier to read-only subset", () => {
    const inspect = SANDBOX_TOOLS_BY_ACCESS_TIER.inspect;
    expect(inspect).toContain("sandbox_read");
    expect(inspect).not.toContain("sandbox_write");
  });

  it("parses sandbox_shell input", () => {
    const input = SandboxShellInputSchema.parse({
      cmd: "pnpm",
      args: ["test"],
      cwd: "/vercel/sandbox/app",
      mode: "foreground",
    });
    expect(input.cmd).toBe("pnpm");
  });

  it("parses sandbox_read with offset and limit", () => {
    const input = SandboxReadInputSchema.parse({
      path: "/vercel/sandbox/app/README.md",
      offset: 10,
      limit: 100,
    });
    expect(input.offset).toBe(10);
  });
});
