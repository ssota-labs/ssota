"use client";

import type { Editor } from "@tiptap/react";
import { LinkIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
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
import {
  applyLinkForm,
  readLinkForm,
  type LinkSelectionRange,
} from "./link-editor";

export function LinkPopover({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [href, setHref] = useState("");
  const [hadLink, setHadLink] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const rangeRef = useRef<LinkSelectionRange | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const syncFromEditor = () => {
    const form = readLinkForm(editor);
    rangeRef.current = form.range;
    setTitle(form.title);
    setHref(form.href);
    setHadLink(form.hadLink);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      syncFromEditor();
    } else {
      rangeRef.current = null;
    }
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const apply = () => {
    const range = rangeRef.current;
    if (!range) return;
    applyLinkForm(editor, range, href, title);
    handleOpenChange(false);
  };

  const remove = () => {
    const range = rangeRef.current;
    if (!range) return;
    applyLinkForm(editor, range, "", title);
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
                  variant={editor.isActive("link") ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Link"
                  className="ssota-editor-toolbar-button"
                />
              }
            />
          }
        >
          <LinkIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="top">Link</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="ssota-link-popover w-72 p-3"
        align="center"
        side="bottom"
        data-testid="ssota-link-popover"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssota-link-title">제목</Label>
            <Input
              ref={titleInputRef}
              id="ssota-link-title"
              value={title}
              placeholder="표시 텍스트"
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssota-link-url">링크</Label>
            <Input
              id="ssota-link-url"
              type="url"
              value={href}
              placeholder="https://"
              onChange={(event) => setHref(event.currentTarget.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            {hadLink ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                링크 제거
              </Button>
            ) : null}
            <Button type="submit" size="sm">
              적용
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
