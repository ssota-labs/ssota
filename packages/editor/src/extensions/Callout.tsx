"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import {
  InfoIcon,
  LightbulbIcon,
  WarningIcon,
} from "@phosphor-icons/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
    };
  }
}

export type CalloutVariant = "info" | "warning" | "tip";

const variantIcon: Record<CalloutVariant, typeof InfoIcon> = {
  info: InfoIcon,
  warning: WarningIcon,
  tip: LightbulbIcon,
};

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const variant = (node.attrs.variant as CalloutVariant) ?? "info";
  const Icon = variantIcon[variant] ?? InfoIcon;

  return (
    <NodeViewWrapper
      as="div"
      className={`ssota-callout ssota-callout--${variant}`}
      data-variant={variant}
    >
      <div className="ssota-callout-header">
        <Icon className="size-4 shrink-0" aria-hidden />
        <select
          className="ssota-callout-variant"
          value={variant}
          aria-label="Callout type"
          contentEditable={false}
          onChange={(event) =>
            updateAttributes({ variant: event.target.value as CalloutVariant })
          }
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="tip">Tip</option>
        </select>
      </div>
      <NodeViewContent className="ssota-callout-content" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
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
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
