"use client";

import { XIcon, SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import type { PendingAttachment } from "./use-image-attachments";

interface AttachmentsPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}

/** Thumbnail strip of pending image attachments shown above the composer. */
export function AttachmentsPreview({
  attachments,
  onRemove,
}: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div
      data-testid="attachment-preview"
      className="flex flex-wrap gap-2 px-2 pb-2 pt-1"
    >
      {attachments.map((a) => (
        <div key={a.id} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.previewUrl}
            alt={a.filename}
            className={cn(
              "size-16 rounded-lg border object-cover",
              a.status === "error" && "opacity-50",
            )}
          />
          {a.status === "uploading" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <SpinnerGapIcon className="size-5 animate-spin text-white" />
            </div>
          ) : null}
          {a.status === "error" ? (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-lg bg-destructive/30"
              title={a.error}
            >
              <WarningIcon className="size-5 text-destructive" />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity hover:bg-foreground/80 group-hover:opacity-100"
            aria-label={`${a.filename} 제거`}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
