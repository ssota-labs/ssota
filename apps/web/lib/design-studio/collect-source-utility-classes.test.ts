import { describe, expect, it } from "vitest";
import { collectUtilityClassesFromSourceFiles } from "./collect-source-utility-classes";

describe("collectUtilityClassesFromSourceFiles", () => {
  it("collects class tokens from JSX className attributes", () => {
    const files = {
      "Component.tsx": `
export default function Component() {
  return (
    <button className="rounded-md border-2 border-blue-500 bg-primary px-4">
      Click
    </button>
  );
}
`,
    };

    expect(collectUtilityClassesFromSourceFiles(files).sort()).toEqual(
      [
        "bg-primary",
        "border-2",
        "border-blue-500",
        "px-4",
        "rounded-md",
      ].sort(),
    );
  });
});
