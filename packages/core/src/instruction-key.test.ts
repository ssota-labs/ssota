import { describe, expect, it } from "vitest";
import { deriveInstructionKeyFromTitle } from "./instruction-key.js";

describe("deriveInstructionKeyFromTitle", () => {
  it("slugifies English titles", () => {
    expect(
      deriveInstructionKeyFromTitle("Homepage Creation", () => false),
    ).toBe("homepage_creation");
  });

  it("uses wf_<suffix> for non-Latin titles", () => {
    const key = deriveInstructionKeyFromTitle("홈페이지 제작", () => false);
    expect(key).toMatch(/^wf_[a-z0-9]{8}$/);
  });

  it("appends suffix when key is taken", () => {
    const key = deriveInstructionKeyFromTitle("Homepage Creation", (candidate) =>
      candidate === "homepage_creation",
    );
    expect(key).toMatch(/^homepage_creation_[a-z0-9]{8}$/);
  });
});
