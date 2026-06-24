"use client";

import { useRef, useState } from "react";
import {
  ArrowUpIcon,
  StopIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";
import type { FileUIPart } from "ai";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import { ModelSelector } from "./model-selector";
import { MentionDropdown } from "./mention-dropdown";
import { useMentionSuggestions } from "./use-mention-suggestions";
import { useImageAttachments } from "./use-image-attachments";
import { AttachmentsPreview } from "./attachments-preview";

interface ChatInputProps {
  onSend: (text: string, files: FileUIPart[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  model: string;
  onModelChange: (modelId: string) => void;
}

/**
 * Composer with @mentions, image attachments (Supabase Storage), and a model
 * picker. Auto-resizes; Send/Stop toggle; Enter sends (Shift+Enter newline)
 * unless the mention dropdown is open (then Enter/Tab selects).
 */
export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  projectId,
  orgSlug,
  projectSlug,
  model,
  onModelChange,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  /** Ignore stale IME onChange/compositionEnd briefly after send. */
  const ignoreStaleInputUntilRef = useRef(0);

  const mention = useMentionSuggestions(orgSlug, projectSlug);
  const attach = useImageAttachments(projectId);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function applyMentionAt(index: number) {
    const el = textareaRef.current;
    const candidate = mention.suggestions[index];
    if (!el || !candidate) return false;
    const next = mention.select(candidate, value, el.selectionStart ?? value.length);
    setValue(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.cursor, next.cursor);
      resize();
    });
    return true;
  }

  function shouldIgnoreStaleInput() {
    return performance.now() < ignoreStaleInputUntilRef.current;
  }

  function syncInput(next: string, cursor?: number) {
    setValue(next);
    mention.refresh(next, cursor ?? next.length);
    resize();
  }

  function submit() {
    const el = textareaRef.current;
    const text = (el?.value ?? value).trim();
    const files = attach.getFileParts();
    if ((!text && files.length === 0) || isStreaming || attach.uploading) return;
    onSend(text, files);
    ignoreStaleInputUntilRef.current = performance.now() + 100;
    setValue("");
    attach.clear();
    mention.close();
    requestAnimationFrame(resize);
  }

  const canSend =
    (value.trim().length > 0 || attach.attachments.some((a) => a.status === "ready")) &&
    !attach.uploading;

  return (
    <form
      className={cn(
        "relative rounded-2xl border bg-background p-2 shadow-sm transition-colors",
        isDragging && "border-primary ring-2 ring-primary/30",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) attach.addFiles(e.dataTransfer.files);
      }}
    >
      {mention.open ? (
        <MentionDropdown
          suggestions={mention.suggestions}
          selectedIndex={mention.selectedIndex}
          onSelect={(c) => {
            const idx = mention.suggestions.indexOf(c);
            applyMentionAt(idx);
          }}
        />
      ) : null}

      <AttachmentsPreview attachments={attach.attachments} onRemove={attach.remove} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            attach.addFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        placeholder="메시지를 입력하세요…  (@로 멘션)"
        className="max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5 text-sm focus:outline-none"
        onChange={(e) => {
          if (shouldIgnoreStaleInput()) {
            setValue("");
            return;
          }
          syncInput(
            e.target.value,
            e.target.selectionStart ?? e.target.value.length,
          );
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          if (shouldIgnoreStaleInput()) {
            setValue("");
            requestAnimationFrame(resize);
            return;
          }
          syncInput(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? e.currentTarget.value.length,
          );
        }}
        onClick={(e) => {
          const el = e.currentTarget;
          mention.refresh(el.value, el.selectionStart ?? el.value.length);
        }}
        onBlur={() => mention.close()}
        onPaste={(e) => {
          const imageItems = Array.from(e.clipboardData?.items ?? []).filter(
            (it) => it.type.startsWith("image/"),
          );
          if (imageItems.length > 0) {
            e.preventDefault();
            const files = imageItems
              .map((it) => it.getAsFile())
              .filter((f): f is File => f !== null);
            attach.addFiles(files);
          }
        }}
        onKeyDown={(e) => {
          if (mention.onKeyDown(e)) {
            if ((e.key === "Enter" || e.key === "Tab") && mention.open) {
              e.preventDefault();
              applyMentionAt(mention.selectedIndex);
            }
            return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            if (e.nativeEvent.isComposing || isComposingRef.current) {
              return;
            }
            e.preventDefault();
            submit();
          }
        }}
      />

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            aria-label="이미지 첨부"
          >
            <PaperclipIcon className="size-4" />
          </Button>
          <ModelSelector value={model} onChange={onModelChange} disabled={isStreaming} />
        </div>

        {isStreaming ? (
          <Button type="button" size="icon" variant="secondary" onClick={onStop}>
            <StopIcon className="size-4" weight="fill" />
            <span className="sr-only">중지</span>
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!canSend}>
            <ArrowUpIcon className="size-4" />
            <span className="sr-only">전송</span>
          </Button>
        )}
      </div>
    </form>
  );
}
