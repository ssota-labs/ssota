import { describe, expect, it } from "vitest";
import {
  resolvePathWithinRoots,
  SandboxPathPolicyError,
} from "../sandbox/path-policy.js";

describe("resolvePathWithinRoots", () => {
  const roots = ["/vercel/sandbox", "/vercel/sandbox/app"];
  const cwd = "/vercel/sandbox";

  it("allows paths inside working directory", () => {
    expect(resolvePathWithinRoots("app/readme.md", roots, cwd)).toBe(
      "/vercel/sandbox/app/readme.md",
    );
  });

  it("allows absolute paths under allowed roots", () => {
    expect(resolvePathWithinRoots("/vercel/sandbox/app/main.ts", roots, cwd)).toBe(
      "/vercel/sandbox/app/main.ts",
    );
  });

  it("rejects paths outside allowed roots", () => {
    expect(() => resolvePathWithinRoots("/etc/passwd", roots, cwd)).toThrow(
      SandboxPathPolicyError,
    );
  });
});
