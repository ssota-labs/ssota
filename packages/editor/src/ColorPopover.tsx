"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import type { EditorColorSwatch } from "./color-palette";
import {
  applyEditorColor,
  getActiveEditorColor,
  isEditorColorActive,
  type EditorColorKind,
} from "./color-editor";

type SelectionRange = {
  from: number;
  to: number;
};

export function ColorPopover({
  editor,
  kind,
  label,
  swatches,
  open,
  onOpenChange,
  children,
}: {
  editor: Editor;
  kind: EditorColorKind;
  label: string;
  swatches: EditorColorSwatch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const rangeRef = useRef<SelectionRange | null>(null);
  const active = isEditorColorActive(editor, kind);
  const currentColor = getActiveEditorColor(editor, kind);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      rangeRef.current = { from, to };
      setTooltipOpen(false);
    } else {
      rangeRef.current = null;
    }
    onOpenChange(next);
  };

  const selectColor = (color: string) => {
    const range = rangeRef.current;
    if (range) {
      editor.chain().focus().setTextSelection(range).run();
    }
    applyEditorColor(editor, kind, color);
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip open={open ? false : tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={active ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label={label}
                  className="ssota-editor-toolbar-button"
                />
              }
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="ssota-color-popover w-auto p-2"
        align="center"
        side="top"
        data-testid={`ssota-${kind}-color-popover`}
      >
        <div
          className="ssota-color-swatch-grid"
          role="listbox"
          aria-label={label}
        >
          {swatches.map((swatch) => {
            const selected =
              swatch.value === currentColor ||
              (!swatch.value && !currentColor);
            return (
              <button
                key={`${kind}-${swatch.label}`}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={swatch.label}
                title={swatch.label}
                className={`ssota-color-swatch${selected ? " ssota-color-swatch--selected" : ""}${!swatch.value ? " ssota-color-swatch--clear" : ""}`}
                style={
                  swatch.value
                    ? {
                        backgroundColor:
                          kind === "text" ? "var(--background)" : swatch.value,
                        color: kind === "text" ? swatch.value : "var(--foreground)",
                      }
                    : undefined
                }
                onClick={() => selectColor(swatch.value)}
              >
                {kind === "text" ? "A" : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
