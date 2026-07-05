import { describe, expect, it } from "vitest";
import { parsePluginManifests } from "./plugin-manifest.js";

describe("parsePluginManifests", () => {
  it("parses Claude marketplace plugins", () => {
    const refs = parsePluginManifests({
      claudeMarketplace: JSON.stringify({
        plugins: [
          {
            name: "document-skills",
            skills: ["./skills/review", "./skills/test"],
          },
        ],
      }),
    });

    expect(refs).toEqual([
      {
        skillPath: "skills/review/SKILL.md",
        pluginName: "document-skills",
      },
      {
        skillPath: "skills/test/SKILL.md",
        pluginName: "document-skills",
      },
    ]);
  });

  it("normalizes Cursor skills string field", () => {
    const refs = parsePluginManifests({
      cursorPlugin: JSON.stringify({
        name: "ssota-plugin",
        skills: "./skills/ssota-mcp",
      }),
    });

    expect(refs).toEqual([
      {
        skillPath: "skills/ssota-mcp/SKILL.md",
        pluginName: "ssota-plugin",
      },
    ]);
  });
});
