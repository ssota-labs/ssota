"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import {
  InfoIcon,
  LightbulbIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
    };
  }
}

export type CalloutVariant = "info" | "warning" | "tip";

const CALLOUT_VARIANTS: {
  value: CalloutVariant;
  label: string;
  icon: typeof InfoIcon;
}[] = [
  { value: "info", label: "Info", icon: InfoIcon },
  { value: "warning", label: "Warning", icon: WarningIcon },
  { value: "tip", label: "Tip", icon: LightbulbIcon },
];

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const variant = (node.attrs.variant as CalloutVariant) ?? "info";
  const current = CALLOUT_VARIANTS.find((item) => item.value === variant);
  const Icon = current?.icon ?? InfoIcon;

  return (
    <NodeViewWrapper
      as="div"
      className={`ssota-callout ssota-callout--${variant}`}
      data-variant={variant}
    >
      <div className="ssota-callout-layout">
        <div className="ssota-callout-icon-col">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              aria-label="Change callout icon"
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ssota-callout-icon-trigger"
                  contentEditable={false}
                  data-testid="ssota-callout-icon-trigger"
                />
              }
            >
              <Icon className="size-4" aria-hidden />
            </PopoverTrigger>
            <PopoverContent
              className="ssota-callout-icon-popover w-auto p-1"
              align="start"
              side="bottom"
            >
              <div
                className="flex items-center gap-0.5"
                role="listbox"
                aria-label="Callout icon"
              >
                {CALLOUT_VARIANTS.map((item) => {
                  const ItemIcon = item.icon;
                  const selected = item.value === variant;
                  return (
                    <Button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      variant={selected ? "secondary" : "ghost"}
                      size="icon-xs"
                      title={item.label}
                      aria-label={item.label}
                      className="ssota-callout-icon-option"
                      onClick={() => {
                        updateAttributes({ variant: item.value });
                        setOpen(false);
                      }}
                    >
                      <ItemIcon className="size-4" />
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <NodeViewContent className="ssota-callout-content" />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "calloutTitle? block*",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) =>
          element.getAttribute("data-variant") ?? "info",
        renderHTML: (attributes) => ({
          "data-variant": attributes.variant as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "ssota-callout",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (variant: CalloutVariant = "info") =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { variant },
              content: [{ type: "calloutTitle" }, { type: "paragraph" }],
            })
            .command(({ tr, dispatch }) => {
              const { $from } = tr.selection;

              for (let depth = $from.depth; depth > 0; depth -= 1) {
                if ($from.node(depth).type.name !== "callout") continue;

                const titlePos = $from.start(depth) + 1;
                if (dispatch) {
                  tr.setSelection(TextSelection.create(tr.doc, titlePos));
                }
                return true;
              }

              return false;
            })
            .focus()
            .run(),
    };
  },
});
