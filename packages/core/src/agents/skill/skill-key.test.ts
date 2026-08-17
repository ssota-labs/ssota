import { describe, expect, it } from "vitest";
import {
  humanizeSkillName,
  normalizeSkillKey,
  skillKeyFromFolderName,
  skillKeyFromSkillPath,
  toSkillKey,
  uniquifySkillKey,
} from "./skill-key.js";

describe("toSkillKey", () => {
  it("romanizes and kebab-cases display names", () => {
    expect(toSkillKey("Frontend Design")).toBe("frontend-design");
    expect(toSkillKey("SSOTA 개발")).toBe("ssota-gaebal");
  });

  it("returns skill for empty input", () => {
    expect(toSkillKey("   ")).toBe("skill");
  });
});

describe("normalizeSkillKey", () => {
  it("truncates long keys to 48 chars", () => {
    const long = "a".repeat(60);
    expect(normalizeSkillKey(long).length).toBeLessThanOrEqual(48);
  });
});

describe("humanizeSkillName", () => {
  it("title-cases hyphenated names", () => {
    expect(humanizeSkillName("frontend-design")).toBe("Frontend Design");
  });
});

describe("skillKeyFromSkillPath", () => {
  it("uses the parent directory name", () => {
    expect(skillKeyFromSkillPath("skills/supabase/SKILL.md")).toBe("supabase");
    expect(skillKeyFromSkillPath("SKILL.md")).toBe("skill");
  });
});

describe("skillKeyFromFolderName", () => {
  it("slugifies folder names", () => {
    expect(skillKeyFromFolderName("My Team Skill")).toBe("my-team-skill");
  });
});

describe("uniquifySkillKey", () => {
  it("appends numeric suffix when base is taken", () => {
    expect(uniquifySkillKey("my-skill", ["my-skill"])).toBe("my-skill-2");
    expect(uniquifySkillKey("my-skill", ["my-skill", "my-skill-2"])).toBe(
      "my-skill-3",
    );
  });
});
