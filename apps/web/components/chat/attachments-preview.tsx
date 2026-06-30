"use client";

import { XIcon } from "@phosphor-icons/react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@ssota/ui/components/ui/attachment";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import type { PendingAttachment } from "./use-image-attachments";

interface AttachmentsPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}

function mapAttachmentState(
  status: PendingAttachment["status"],
): "uploading" | "error" | "done" {
  if (status === "uploading") return "uploading";
  if (status === "error") return "error";
  return "done";
}

/** Pending image attachments shown above the composer. */
export function AttachmentsPreview({
  attachments,
  onRemove,
}: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <AttachmentGroup
      data-testid="attachment-preview"
      className="px-2 pb-2 pt-1"
    >
      {attachments.map((a) => (
        <Attachment
          key={a.id}
          orientation="vertical"
          state={mapAttachmentState(a.status)}
          size="sm"
          className="w-24"
        >
          <AttachmentMedia variant="image">
            {a.status === "uploading" ? (
              <Spinner />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.previewUrl} alt={a.filename} />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{a.filename}</AttachmentTitle>
            {a.status === "error" ? (
              <AttachmentDescription>{a.error}</AttachmentDescription>
            ) : a.status === "uploading" ? (
              <AttachmentDescription>Uploading</AttachmentDescription>
            ) : null}
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`${a.filename} 제거`}
              onClick={() => onRemove(a.id)}
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}
