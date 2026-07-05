import { describe, expect, it } from "vitest";
import { validateSkillMd } from "./validate-skill-md.js";

describe("validateSkillMd", () => {
  it("accepts valid Agent Skills frontmatter", () => {
    expect(
      validateSkillMd(`---
name: deploy-to-vercel
description: Deploy applications to Vercel with best practices.
---
`),
    ).toEqual({
      name: "deploy-to-vercel",
      description: "Deploy applications to Vercel with best practices.",
    });
  });

  it("rejects missing frontmatter", () => {
    expect(validateSkillMd("# No frontmatter")).toBeNull();
  });

  it("rejects invalid name format", () => {
    expect(
      validateSkillMd(`---
name: Bad_Name
description: Invalid name uses underscore.
---
`),
    ).toBeNull();
  });

  it("rejects internal skills", () => {
    expect(
      validateSkillMd(`---
name: hidden
description: Internal only
metadata:
  internal: true
---
`),
    ).toBeNull();
  });
});
