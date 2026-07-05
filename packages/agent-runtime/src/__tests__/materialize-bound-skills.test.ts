import { describe, expect, it, vi } from "vitest";
import type { SkillPort, SandboxHandle } from "@ssota/core";
import { materializeBoundSkills } from "../sandbox/materialize-bound-skills.js";

describe("materializeBoundSkills", () => {
  it("writes ready binding packages into sandbox skill tree", async () => {
    const exec = vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const handle = {
      sessionId: "sess",
      vercelSandboxId: "sb",
      workingDirectory: "/vercel/sandbox",
      allowedRoots: ["/vercel/sandbox"],
      exec,
      readFile: vi.fn(),
      writeFile,
      deleteFile: vi.fn(),
      snapshot: vi.fn(),
      stop: vi.fn(),
    } satisfies SandboxHandle;

    const skillPort: SkillPort = {
      async listReadySkillBindings() {
        return [
          {
            agentDefinitionId: "agent-1",
            skillId: "skill-1",
            enabled: true,
            sortOrder: 0,
            lock: {
              source: "supabase",
              sourceType: "platform",
              skillPath: "SKILL.md",
              computedHash: "hash-1",
            },
            lockStatus: "ready",
            lockError: null,
            skillKey: "supabase",
          },
        ];
      },
      async getSkillPackageByHash() {
        return {
          id: "pkg-1",
          organizationId: "org-1",
          contentHash: "hash-1",
          sourceType: "platform",
          storageKey: null,
          files: [{ path: "SKILL.md", contents: "skill body" }],
          fileCount: 1,
          sizeBytes: 10,
          createdAt: new Date().toISOString(),
        };
      },
    } as unknown as SkillPort;

    const keys = await materializeBoundSkills({
      handle,
      workingRoot: "/vercel/sandbox",
      organizationId: "org-1",
      agentDefinitionId: "agent-1",
      skillPort,
    });

    expect(keys).toEqual(["supabase"]);
    expect(writeFile).toHaveBeenCalledWith(
      "/vercel/sandbox/.ssota/skills/supabase/SKILL.md",
      "skill body",
    );
  });
});
