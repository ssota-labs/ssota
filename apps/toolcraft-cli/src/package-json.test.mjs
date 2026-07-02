import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createGeneratedPackageJson,
  normalizeProjectTitle,
  sanitizePackageName,
} from "./package-json.mjs";

describe("sanitizePackageName", () => {
  it("normalizes package names for generated apps", () => {
    assert.equal(sanitizePackageName(" Mesh Gradient "), "mesh-gradient");
    assert.equal(sanitizePackageName("@Pixel Point/Mesh Gradient"), "pixel-point/mesh-gradient");
    assert.equal(sanitizePackageName(""), "toolcraft-app");
  });
});

describe("normalizeProjectTitle", () => {
  it("creates a human-readable title from generated project names", () => {
    assert.equal(normalizeProjectTitle("mesh-gradient"), "Mesh Gradient");
    assert.equal(normalizeProjectTitle("mesh_gradient.app"), "Mesh Gradient App");
    assert.equal(normalizeProjectTitle("@pixel-point/mesh-gradient"), "Pixel Point Mesh Gradient");
    assert.equal(normalizeProjectTitle(""), "Toolcraft App");
  });
});

describe("createGeneratedPackageJson", () => {
  it("uses the starter package manifest as source of truth", () => {
    const packageJson = createGeneratedPackageJson({
      name: "Generated App",
      starterPackageJson: {
        license: "SEE LICENSE IN LICENSE.md",
        type: "module",
        scripts: {
          dev: "vite dev",
          test: "vitest run",
        },
        dependencies: {
          "@repo/toolcraft-runtime": "workspace:*",
          "@repo/ui": "workspace:*",
          "@tanstack/react-router": "1.170.6",
          cmdk: "^1.1.1",
          react: "^19.2.0",
        },
        devDependencies: {
          "@repo/typescript-config": "workspace:*",
          typescript: "^6.0.3",
          vitest: "^3.0.5",
        },
      },
    });

    assert.deepEqual(packageJson, {
      name: "generated-app",
      private: true,
      license: "SEE LICENSE IN LICENSE.md",
      type: "module",
      scripts: {
        dev: "vite dev",
        test: "vitest run",
      },
      dependencies: {
        "@tanstack/react-router": "1.170.6",
        cmdk: "^1.1.1",
        react: "^19.2.0",
      },
      devDependencies: {
        typescript: "^6.0.3",
        vitest: "^3.0.5",
      },
    });
  });

  it("rejects missing starter package manifests", () => {
    assert.throws(
      () => createGeneratedPackageJson({ name: "Generated App" }),
      /starterPackageJson is required/,
    );
  });
});
