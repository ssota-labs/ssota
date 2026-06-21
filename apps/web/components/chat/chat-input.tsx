"use client";

import { useRef, useState } from "react";
import { ArrowUpIcon, StopIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

/** Auto-resizing composer with a Send/Stop toggle (open-agents-style). */
export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(resize);
  }

  return (
    <form
      className="rounded-2xl border bg-background p-2 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        placeholder="Send a message…"
        className="max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5 text-sm focus:outline-none"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex justify-end px-1 pt-1">
        {isStreaming ? (
          <Button type="button" size="icon" variant="secondary" onClick={onStop}>
            <StopIcon className="size-4" weight="fill" />
            <span className="sr-only">Stop</span>
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!value.trim()}>
            <ArrowUpIcon className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        )}
      </div>
    </form>
  );
}
