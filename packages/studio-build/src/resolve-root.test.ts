import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveStudioBuildRoot } from "./resolve-root.js";

describe("resolveStudioBuildRoot", () => {
  it("prefers apps/web as the studio build resolve root", () => {
    const root = resolveStudioBuildRoot();
    const appsWeb = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../apps/web",
    );
    expect(path.resolve(root)).toBe(appsWeb);
  });
});
