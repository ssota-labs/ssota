import { describe, expect, it } from "vitest";
import {
  hashSkillFiles,
  inferLockSourceType,
  parseGithubRepo,
  skillDirFromPath,
} from "../src/ports/skill-helpers.js";

describe("skill-helpers", () => {
  it("hashes files deterministically", () => {
    const hashA = hashSkillFiles([
      { path: "SKILL.md", contents: "hello" },
      { path: "references/a.md", contents: "ref" },
    ]);
    const hashB = hashSkillFiles([
      { path: "references/a.md", contents: "ref" },
      { path: "SKILL.md", contents: "hello" },
    ]);
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it("parses github repo sources", () => {
    expect(parseGithubRepo("vercel-labs/agent-skills")).toEqual({
      owner: "vercel-labs",
      repo: "agent-skills",
    });
    expect(parseGithubRepo("https://github.com/supabase/agent-skills")).toEqual({
      owner: "supabase",
      repo: "agent-skills",
    });
  });

  it("derives skill directory from skill path", () => {
    expect(skillDirFromPath("skills/foo/SKILL.md")).toBe("skills/foo");
    expect(skillDirFromPath("SKILL.md")).toBe("");
  });

  it("infers platform source type for builtins", () => {
    expect(
      inferLockSourceType({
        organizationId: null,
        source: "builtin",
        metadata: {},
        externalId: null,
      }),
    ).toBe("platform");
  });

  it("infers inline source type when package hash present", () => {
    expect(
      inferLockSourceType({
        organizationId: "org",
        source: "custom",
        metadata: { packageHash: "abc" },
        externalId: null,
      }),
    ).toBe("inline");
  });
});
