"use client";

import type { StudioNode } from "@ssota/contracts/catalog";
import type { Icon } from "@phosphor-icons/react";
import {
  BracketsAngleIcon,
  CubeIcon,
  ImageIcon,
  LinkIcon,
  ParagraphIcon,
  SquareIcon,
  TextHOneIcon,
  TextTIcon,
  TextboxIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TAG_ICONS: Record<string, Icon> = {
  button: SquareIcon,
  div: SquareIcon,
  span: TextTIcon,
  p: ParagraphIcon,
  img: ImageIcon,
  a: LinkIcon,
  input: TextboxIcon,
  textarea: TextboxIcon,
  h1: TextHOneIcon,
  h2: TextHOneIcon,
  h3: TextHOneIcon,
  h4: TextHOneIcon,
  h5: TextHOneIcon,
  h6: TextHOneIcon,
};

type LayerNodeIconProps = {
  node: StudioNode;
  className?: string;
};

export function LayerNodeIcon({ node, className }: LayerNodeIconProps) {
  let IconComponent: Icon = SquareIcon;

  switch (node.kind) {
    case "element":
      IconComponent = TAG_ICONS[node.tag] ?? SquareIcon;
      break;
    case "component":
      IconComponent = CubeIcon;
      break;
    case "text":
      IconComponent = TextTIcon;
      break;
    case "fragment":
      IconComponent = BracketsAngleIcon;
      break;
  }

  return (
    <IconComponent
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      aria-hidden
    />
  );
}
