import type { UiComponentContentV2 } from "@ssota/contracts/catalog";

const DEFAULT_SOURCE_ENTRY = "Component.tsx";

const UTILS_SOURCE = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const BUTTON_SOURCE = `import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <BaseButton className={cn(buttonVariants({ variant }), className)} {...props} />
  );
}
`;

const COMPONENT_SOURCE = `import { Button } from "./components/ui/button";

export default function Component() {
  return <Button>Button</Button>;
}
`;

export function createEmptyUiComponentContentV2(): UiComponentContentV2 {
  return {
    schemaVersion: 2,
    files: {
      [DEFAULT_SOURCE_ENTRY]: COMPONENT_SOURCE,
      "components/ui/button.tsx": BUTTON_SOURCE,
      "lib/utils.ts": UTILS_SOURCE,
    },
  };
}

export function defaultSourceComponentProperties(slug: string) {
  const contentV2 = createEmptyUiComponentContentV2();
  return {
    slug,
    tier: "primitive" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: DEFAULT_SOURCE_ENTRY,
    fileKeys: Object.keys(contentV2.files),
    files: contentV2.files,
  };
}
