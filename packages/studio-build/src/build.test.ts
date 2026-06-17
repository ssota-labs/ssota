import { describe, expect, it } from "vitest";
import { assertAllowedDependencies, buildStudioBundle, computeBuildHash } from "./index.js";

describe("computeBuildHash", () => {
  it("is stable for the same input", () => {
    const input = {
      projectId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: { "Component.tsx": "export default function C() { return null; }" },
      dependencies: { "@ssota/ui": "workspace:*" },
      studioRuntimeInject: true,
    };
    expect(computeBuildHash(input)).toBe(computeBuildHash(input));
  });
});

describe("assertAllowedDependencies", () => {
  it("rejects unknown dependency", () => {
    expect(() =>
      assertAllowedDependencies({ lodash: "1.0.0" }),
    ).toThrow(/not allowed/);
  });
});

describe("buildStudioBundle", () => {
  it("builds a simple React component", async () => {
    const artifacts = await buildStudioBundle({
      projectId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: {
        "Component.tsx": `
          export default function Component() {
            return <div className="studio-test">Hello</div>;
          }
        `,
      },
      dependencies: {},
      studioRuntimeInject: true,
    });

    const js = new TextDecoder().decode(artifacts.js);
    expect(js).toContain("studio-test");
    expect(js).toContain("STUDIO_READY");
  });

  it("rejects empty files", async () => {
    await expect(
      buildStudioBundle({
        projectId: "00000000-0000-4000-8000-000000000001",
        entry: "Component.tsx",
        files: {},
        dependencies: {},
        studioRuntimeInject: true,
      }),
    ).rejects.toThrow(/empty/);
  });
});
