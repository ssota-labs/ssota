"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { CaretRightIcon } from "@phosphor-icons/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

function ToggleView({ node, updateAttributes, editor }: NodeViewProps) {
  const open = Boolean(node.attrs.open);

  return (
    <NodeViewWrapper as="div" className="ssota-toggle" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="ssota-toggle-trigger"
        aria-expanded={open}
        contentEditable={false}
        onClick={() => updateAttributes({ open: !open })}
      >
        <CaretRightIcon
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="ssota-toggle-label">Toggle</span>
      </button>
      <div
        className="ssota-toggle-body"
        hidden={!open}
        onClick={() => {
          if (!open) {
            updateAttributes({ open: true });
            editor.commands.focus();
          }
        }}
      >
        <NodeViewContent className="ssota-toggle-content" />
      </div>
    </NodeViewWrapper>
  );
}

export const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle",
        class: "ssota-toggle",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
