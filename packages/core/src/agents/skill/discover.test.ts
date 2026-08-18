import { describe, expect, it } from "vitest";
import { discoverSkillsFromTree } from "./discover.js";

const VALID_SKILL = `---
name: frontend-design
description: Design polished frontend interfaces with strong visual hierarchy.
---

# Frontend Design
`;

const INTERNAL_SKILL = `---
name: internal-only
description: Hidden skill
metadata:
  internal: true
---
`;

describe("discoverSkillsFromTree", () => {
  it("discovers valid skills from conventional paths and hides invalid", () => {
    const result = discoverSkillsFromTree({
      files: [
        { path: "skills/frontend-design/SKILL.md", contents: VALID_SKILL },
        { path: "skills/broken/SKILL.md", contents: "no frontmatter" },
        { path: "skills/hidden/SKILL.md", contents: INTERNAL_SKILL },
      ],
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.skillPath).toBe("skills/frontend-design/SKILL.md");
    expect(result.skills[0]?.suggestedKey).toBe("frontend-design");
    expect(result.skippedCount).toBeGreaterThanOrEqual(2);
  });

  it("discovers manifest-declared skills", () => {
    const result = discoverSkillsFromTree({
      files: [
        {
          path: "plugins/doc/skills/review/SKILL.md",
          contents: `---
name: review
description: Review pull requests for quality and security.
---
`,
        },
      ],
      manifests: {
        claudePlugin: JSON.stringify({
          name: "document-skills",
          skills: ["./plugins/doc/skills/review"],
        }),
      },
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.pluginName).toBe("document-skills");
    expect(result.skills[0]?.skillPath).toBe(
      "plugins/doc/skills/review/SKILL.md",
    );
  });

  it("dedupes by frontmatter name keeping higher-priority path", () => {
    const dup = `---
name: supabase
description: Supabase integration patterns.
---
`;
    const result = discoverSkillsFromTree({
      files: [
        { path: "skills/supabase/SKILL.md", contents: dup },
        { path: ".agents/skills/supabase/SKILL.md", contents: dup },
      ],
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.skillPath).toBe("skills/supabase/SKILL.md");
  });
});
