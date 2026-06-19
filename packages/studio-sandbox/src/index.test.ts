import { describe, expect, it } from "vitest";
import { PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON } from "@ssota/contracts/catalog";
import { createViteScaffold, studioBuildBackend } from "./vite-scaffold.js";

describe("createViteScaffold", () => {
  it("materializes package.json and user source files", () => {
    const files = createViteScaffold({
      projectId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: {
        "Component.tsx": "export default function C() { return null; }",
      },
      packageJson: PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON,
      lockfile: "lockfileVersion: '9.0'\n",
      toolchainDigest: "abc",
      themeCss: "  --primary: red;",
      studioRuntimeInject: true,
    });

    expect(files["package.json"]).toContain("studio-user-components");
    expect(files["src/Component.tsx"]).toContain("export default");
    expect(files["src/styles/theme.css"]).toContain("--primary: red;");
  });
});

describe("studioBuildBackend", () => {
  it("defaults to esbuild", () => {
    const previous = process.env.STUDIO_BUILD_BACKEND;
    delete process.env.STUDIO_BUILD_BACKEND;
    expect(studioBuildBackend()).toBe("esbuild");
    if (previous) process.env.STUDIO_BUILD_BACKEND = previous;
  });
});
