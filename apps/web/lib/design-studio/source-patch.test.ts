import { describe, expect, it } from "vitest";
import { hashContentStructure } from "./content-structure-hash";
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

  it("does not change structure hash for className-only edits", () => {
    const sourceRef = { file: "Component.tsx", loc: "Component.tsx:4:9" };
    const content = {
      schemaVersion: 2 as const,
      files: SAMPLE,
    };
    const nextFiles = patchSourceClassName(
      SAMPLE,
      sourceRef,
      "rounded-md bg-blue-600 text-white",
    );
    const after = { schemaVersion: 2 as const, files: nextFiles };
    expect(hashContentStructure(content)).toBe(hashContentStructure(after));
  });

  it("does not change structure hash for seeded demo button source", () => {
    const seedFiles = {
      "Component.tsx": `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return (
    <Button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
      Button
    </Button>
  );
}
`,
    };
    const sourceRef = { file: "Component.tsx", loc: "Component.tsx:5:4" };
    const before = { schemaVersion: 2 as const, files: seedFiles };
    const nextFiles = patchSourceClassName(
      seedFiles,
      sourceRef,
      "rounded-md bg-blue-600 px-4 py-2 text-primary-foreground",
    );
    const after = { schemaVersion: 2 as const, files: nextFiles };
    expect(hashContentStructure(before)).toBe(hashContentStructure(after));
  });
});
