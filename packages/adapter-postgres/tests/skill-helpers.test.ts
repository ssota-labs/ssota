import { describe, expect, it } from "vitest";
import {
  hashSkillFiles,
  inferLockSourceType,
  parseGithubRepo,
  resolveGithubDefaultRef,
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

  it("resolves github default branch from repo metadata", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ default_branch: "develop" }), {
        status: 200,
      });
    try {
      await expect(resolveGithubDefaultRef("acme", "skills")).resolves.toBe(
        "develop",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to main when github default branch lookup fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("", { status: 404 });
    try {
      await expect(resolveGithubDefaultRef("acme", "skills")).resolves.toBe(
        "main",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
