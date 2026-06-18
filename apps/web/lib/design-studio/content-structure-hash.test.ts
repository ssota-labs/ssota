import { describe, expect, it } from "vitest";
import {
  collectClassNamesFromContentV2,
  hashContentStructure,
} from "./content-structure-hash";

describe("hashContentStructure", () => {
  it("detects structural JSX changes", () => {
    const before = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `<Button className="rounded-md">Hi</Button>`,
      },
    };
    const after = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `<div><Button className="rounded-md">Hi</Button></div>`,
      },
    };

    expect(hashContentStructure(before)).not.toBe(hashContentStructure(after));
  });

  it("ignores className-only changes", () => {
    const before = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `<Button className="rounded-md">Hi</Button>`,
      },
    };
    const after = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `<Button className="rounded-lg p-8">Hi</Button>`,
      },
    };

    expect(hashContentStructure(before)).toBe(hashContentStructure(after));
  });

  it("ignores babel formatting drift on className-only patches", () => {
    const before = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return (
    <Button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
      Button
    </Button>
  );
}
`,
      },
    };
    const after = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return (
    <Button className="rounded-md bg-blue-600 px-4 py-2 text-primary-foreground">
      Button
    </Button>
  );
}
`,
      },
    };

    expect(hashContentStructure(before)).toBe(hashContentStructure(after));
  });
});

describe("collectClassNamesFromContentV2", () => {
  it("collects literal className tokens from source files", () => {
    const content = {
      schemaVersion: 2 as const,
      files: {
        "Component.tsx": `<Button className="rounded-md px-4">Hi</Button>`,
      },
    };

    expect(collectClassNamesFromContentV2(content)).toEqual([
      "rounded-md",
      "px-4",
    ]);
  });
});
