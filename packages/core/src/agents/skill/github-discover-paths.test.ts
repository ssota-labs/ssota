import { describe, expect, it } from "vitest";
import {
  filterPriorityGithubSkillPaths,
  scoreGithubSkillPath,
  sortGithubSkillPaths,
} from "./github-discover-paths.js";

describe("github-discover-paths", () => {
  it("prefers priority container paths over deep paths", () => {
    const paths = [
      "examples/demo/SKILL.md",
      "skills/frontend-design/SKILL.md",
      "SKILL.md",
    ];
    expect([...filterPriorityGithubSkillPaths(paths)].sort()).toEqual(
      ["SKILL.md", "skills/frontend-design/SKILL.md"].sort(),
    );
  });

  it("falls back to all SKILL.md paths when none are priority", () => {
    const paths = ["docs/guide/SKILL.md", "tmp/SKILL.md"];
    expect(filterPriorityGithubSkillPaths(paths)).toEqual(paths);
  });

  it("sorts by priority score then path", () => {
    const sorted = sortGithubSkillPaths([
      ".agents/skills/ssota-mcp/SKILL.md",
      "skills/supabase/SKILL.md",
      "SKILL.md",
    ]);
    expect(sorted[0]).toBe("SKILL.md");
    expect(sorted).toContain("skills/supabase/SKILL.md");
  });

  it("scores catalog layout two levels under skills/", () => {
    expect(scoreGithubSkillPath("skills/.curated/foo/SKILL.md")).toBeLessThan(
      scoreGithubSkillPath("random/nested/SKILL.md"),
    );
  });
});
