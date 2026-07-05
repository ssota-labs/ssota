import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  discoverGithubSkills,
  fetchGithubRepoTree,
  libraryRefsFromSkills,
  skillBundleFromFolderFiles,
} from "../src/ports/skill-github-discover.js";

const VALID_SKILL = `---
name: test-skill
description: A test skill for discovery.
---

# Test Skill
`;

function githubFetchHandler(url: string): Response | null {
  if (url === "https://api.github.com/repos/acme/skills-pack") {
    return new Response(JSON.stringify({ default_branch: "main" }), {
      status: 200,
    });
  }
  if (
    url ===
    "https://api.github.com/repos/acme/skills-pack/git/ref/heads/main"
  ) {
    return new Response(JSON.stringify({ object: { sha: "tree-sha" } }), {
      status: 200,
    });
  }
  if (
    url ===
    "https://api.github.com/repos/acme/skills-pack/git/trees/tree-sha?recursive=1"
  ) {
    return new Response(
      JSON.stringify({
        tree: [
          { path: ".agents/skills/test-skill/SKILL.md", type: "blob" },
          { path: "skills/broken/SKILL.md", type: "blob" },
        ],
      }),
      { status: 200 },
    );
  }
  if (
    url ===
    "https://raw.githubusercontent.com/acme/skills-pack/main/.agents/skills/test-skill/SKILL.md"
  ) {
    return new Response(VALID_SKILL, { status: 200 });
  }
  if (
    url ===
    "https://raw.githubusercontent.com/acme/skills-pack/main/skills/broken/SKILL.md"
  ) {
    return new Response("no frontmatter here", { status: 200 });
  }
  if (url.includes("/git/trees/")) {
    return new Response(JSON.stringify({ tree: [] }), { status: 200 });
  }
  return null;
}

describe("skill-github-discover", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const response = githubFetchHandler(url);
      if (response) return response;
      return new Response("", { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetchGithubRepoTree returns blob paths", async () => {
    const tree = await fetchGithubRepoTree("acme/skills-pack");
    expect(tree.owner).toBe("acme");
    expect(tree.repo).toBe("skills-pack");
    expect(tree.ref).toBe("main");
    expect(tree.paths).toContain(".agents/skills/test-skill/SKILL.md");
  });

  it("discoverGithubSkills returns valid skills and skips invalid", async () => {
    const { skills, skippedCount } = await discoverGithubSkills(
      "acme/skills-pack",
      [],
    );
    expect(skills).toHaveLength(1);
    expect(skills[0]?.skillPath).toBe(".agents/skills/test-skill/SKILL.md");
    expect(skills[0]?.suggestedKey).toBe("test-skill");
    expect(skills[0]?.libraryStatus).toBe("new");
    expect(skippedCount).toBeGreaterThanOrEqual(1);
  });

  it("maps library rows to refs", () => {
    const refs = libraryRefsFromSkills([
      {
        id: "id-1",
        key: "foo",
        contentHash: "hash-a",
        metadata: {
          catalogSource: {
            source: "acme/repo",
            sourceType: "github",
            skillPath: "skills/foo/SKILL.md",
          },
        },
      },
    ]);
    expect(refs[0]?.key).toBe("foo");
    expect(refs[0]?.catalogSource?.skillPath).toBe("skills/foo/SKILL.md");
  });

  it("extracts folder bundle by skill path prefix", () => {
    const bundle = skillBundleFromFolderFiles("skills/foo/SKILL.md", [
      { path: "skills/foo/SKILL.md", contents: VALID_SKILL },
      { path: "skills/foo/refs/a.md", contents: "ref" },
      { path: "skills/bar/SKILL.md", contents: "other" },
    ]);
    expect(bundle.map((f) => f.path)).toEqual([
      "skills/foo/SKILL.md",
      "skills/foo/refs/a.md",
    ]);
  });
});
