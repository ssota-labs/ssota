import { describe, expect, it } from "vitest";
import {
  patchSourceClassName,
  readClassNameFromSource,
} from "./source-patch";

const SAMPLE = {
  "Component.tsx": `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return <Button className="rounded-md bg-primary">Button</Button>;
}
`,
};

describe("patchSourceClassName", () => {
  it("updates className at the source location", () => {
    const sourceRef = { file: "Component.tsx", loc: "Component.tsx:4:9" };
    const current = readClassNameFromSource(SAMPLE, sourceRef);
    expect(current).toBe("rounded-md bg-primary");

    const next = patchSourceClassName(
      SAMPLE,
      sourceRef,
      "rounded-md bg-blue-600 text-white",
    );
    expect(next["Component.tsx"]).toContain("bg-blue-600");
    expect(readClassNameFromSource(next, sourceRef)).toBe(
      "rounded-md bg-blue-600 text-white",
    );
  });

  it("returns original files when loc is missing", () => {
    const next = patchSourceClassName(SAMPLE, { file: "Component.tsx" }, "x");
    expect(next).toEqual(SAMPLE);
  });
});
