import { describe, expect, it } from "vitest";
import { matchDiscoveredSkillsToLibrary } from "./library-match.js";
import type { DiscoveredSkill } from "./discover.js";

const baseSkill: DiscoveredSkill = {
  skillPath: "skills/foo/SKILL.md",
  frontmatterName: "foo",
  description: "Foo skill",
  suggestedKey: "foo",
  displayName: "Foo",
  contentHash: "abc123",
};

describe("matchDiscoveredSkillsToLibrary", () => {
  it("marks new skills", () => {
    const [matched] = matchDiscoveredSkillsToLibrary([baseSkill], []);
    expect(matched?.libraryStatus).toBe("new");
    expect(matched?.resolvedKey).toBe("foo");
  });

  it("marks imported when provenance and hash match", () => {
    const [matched] = matchDiscoveredSkillsToLibrary(
      [baseSkill],
      [
        {
          id: "skill-1",
          key: "foo",
          contentHash: "abc123",
          catalogSource: {
            source: "acme/repo",
            sourceType: "github",
            skillPath: "skills/foo/SKILL.md",
          },
        },
      ],
      { githubRepo: "acme/repo" },
    );
    expect(matched?.libraryStatus).toBe("imported");
    expect(matched?.existingSkillId).toBe("skill-1");
  });

  it("marks update when provenance matches but hash differs", () => {
    const [matched] = matchDiscoveredSkillsToLibrary(
      [baseSkill],
      [
        {
          id: "skill-1",
          key: "foo",
          contentHash: "old-hash",
          catalogSource: {
            source: "acme/repo",
            sourceType: "github",
            skillPath: "skills/foo/SKILL.md",
          },
        },
      ],
      { githubRepo: "acme/repo" },
    );
    expect(matched?.libraryStatus).toBe("update");
  });

  it("assigns suffix on key collision", () => {
    const [matched] = matchDiscoveredSkillsToLibrary(
      [baseSkill],
      [
        {
          id: "other",
          key: "foo",
          contentHash: "different",
          catalogSource: {
            source: "other/repo",
            sourceType: "github",
            skillPath: "other/SKILL.md",
          },
        },
      ],
      { githubRepo: "acme/repo" },
    );
    expect(matched?.libraryStatus).toBe("key_collision");
    expect(matched?.resolvedKey).toBe("foo-2");
  });
});
