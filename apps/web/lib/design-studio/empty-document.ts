import type {
  UiComponentContentV2,
  UiComponentDocument,
} from "@ssota/contracts/catalog";

export function createEmptyUiComponentDocument(): UiComponentDocument {
  return {
    schemaVersion: 1,
    root: {
      kind: "element",
      id: "root",
      tag: "div",
      className: "flex flex-col gap-4 p-6",
      children: [
        {
          kind: "text",
          id: "heading",
          text: "New component",
        },
      ],
    },
  };
}

const DEFAULT_SOURCE_ENTRY = "Component.tsx";

export function createEmptyUiComponentContentV2(): UiComponentContentV2 {
  return {
    schemaVersion: 2,
    files: {
      [DEFAULT_SOURCE_ENTRY]: `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return <Button className="rounded-md">Button</Button>;
}
`,
    },
  };
}

export function defaultSourceComponentProperties(slug: string) {
  return {
    slug,
    tier: "primitive" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: DEFAULT_SOURCE_ENTRY,
    fileKeys: [DEFAULT_SOURCE_ENTRY],
    dependencies: {
      "@ssota/ui": "workspace:*",
    },
  };
}
