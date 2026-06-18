import { describe, expect, it } from "vitest";
import { collectUtilityClassesFromSourceFiles } from "./source-utility-classes";

describe("collectUtilityClassesFromSourceFiles", () => {
  it("collects arbitrary rgba background classes from jsx source", () => {
    const files = {
      "Component.tsx": `export default function Component() {
  return (
    <Button className="rounded-md bg-[rgba(224,8,8,1)] px-4 py-2">
      Button
    </Button>
  );
}`,
    };

    expect(collectUtilityClassesFromSourceFiles(files)).toEqual(
      expect.arrayContaining([
        "rounded-md",
        "bg-[rgba(224,8,8,1)]",
        "px-4",
        "py-2",
      ]),
    );
  });
});
