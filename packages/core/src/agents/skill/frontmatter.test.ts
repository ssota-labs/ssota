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

  it("parses folded block scalar descriptions (>-)", () => {
    const raw = `---
name: swdl-research-pipeline
description: >-
  SWDL research pipeline for graph authoring in the software-development workflow.
  Use for research work orders — not for other specialist roles.
---

# research pipeline`;
    const { frontmatter } = splitSkillFrontmatter(raw);
    expect(frontmatter.name).toBe("swdl-research-pipeline");
    expect(frontmatter.description).toBe(
      "SWDL research pipeline for graph authoring in the software-development workflow. Use for research work orders — not for other specialist roles.",
    );
  });

  it("parses literal block scalar descriptions (|)", () => {
    const raw = `---
description: |
  Line one
  Line two
---
Body`;
    const { frontmatter } = splitSkillFrontmatter(raw);
    expect(frontmatter.description).toBe("Line one\nLine two");
  });
});
