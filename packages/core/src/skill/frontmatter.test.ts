import { describe, expect, it } from "vitest";
import {
  splitSkillFrontmatter,
  stripSkillFrontmatter,
} from "./frontmatter.js";

describe("stripSkillFrontmatter", () => {
  it("removes YAML frontmatter from SKILL.md", () => {
    const raw = `---
name: test-skill
description: A test skill
---

# Body

Content here.`;
    expect(stripSkillFrontmatter(raw)).toBe(`# Body

Content here.`);
  });

  it("returns content unchanged when no frontmatter", () => {
    const raw = "# Just markdown";
    expect(stripSkillFrontmatter(raw)).toBe(raw);
  });

  it("parses name and description from frontmatter", () => {
    const raw = `---
name: ssota-mcp
description: MCP guardrails
---
Body`;
    const { frontmatter, body } = splitSkillFrontmatter(raw);
    expect(frontmatter.name).toBe("ssota-mcp");
    expect(frontmatter.description).toBe("MCP guardrails");
    expect(body).toBe("Body");
  });
});
