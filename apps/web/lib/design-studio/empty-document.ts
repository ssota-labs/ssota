import type { UiComponentContentV2 } from "@ssota/contracts/catalog";

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
