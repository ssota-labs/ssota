import { describe, expect, it } from "vitest";
import { PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON } from "@ssota/contracts/catalog";
import { buildStudioBundle, computeBuildHash } from "./index.js";

const testPackageJson = PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON;
const testLockfile = "lockfileVersion: '9.0'\n";
const testToolchainDigest = "test-toolchain-digest";

describe("computeBuildHash", () => {
  it("is stable for the same input", () => {
    const input = {
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: { "Component.tsx": "export default function C() { return null; }" },
      packageJson: testPackageJson,
      lockfile: testLockfile,
      toolchainDigest: testToolchainDigest,
      studioRuntimeInject: true,
    };
    expect(computeBuildHash(input)).toBe(computeBuildHash(input));
  });
});

describe("buildStudioBundle", () => {
  it("builds a simple React component", async () => {
    const artifacts = await buildStudioBundle({
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: {
        "Component.tsx": `
          export default function Component() {
            return <div className="studio-test">Hello</div>;
          }
        `,
      },
      packageJson: testPackageJson,
      lockfile: testLockfile,
      toolchainDigest: testToolchainDigest,
      studioRuntimeInject: true,
    });

    const js = new TextDecoder().decode(artifacts.js);
    expect(js).toContain("studio-test");
    expect(js).toContain("STUDIO_READY");
  });

  it("resolves extensionless relative imports across virtual files", async () => {
    const artifacts = await buildStudioBundle({
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      entry: "Component.tsx",
      files: {
        "Component.tsx": `
          import { Button } from "./components/ui/button";
          export default function Component() {
            return <Button>Hello</Button>;
          }
        `,
        "components/ui/button.tsx": `
          export function Button({ children }: { children: React.ReactNode }) {
            return <button type="button">{children}</button>;
          }
        `,
      },
      packageJson: testPackageJson,
      lockfile: testLockfile,
      toolchainDigest: testToolchainDigest,
      studioRuntimeInject: true,
    });

    const js = new TextDecoder().decode(artifacts.js);
    expect(js).toContain("Hello");
  });

  it("rejects empty files", async () => {
    await expect(
      buildStudioBundle({
        teamspaceId: "00000000-0000-4000-8000-000000000001",
        entry: "Component.tsx",
        files: {},
        packageJson: testPackageJson,
        lockfile: testLockfile,
        toolchainDigest: testToolchainDigest,
        studioRuntimeInject: true,
      }),
    ).rejects.toThrow(/empty/);
  });
});
