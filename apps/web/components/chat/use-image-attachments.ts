"use client";

import { useCallback, useState } from "react";
import type { FileUIPart } from "ai";

export interface PendingAttachment {
  id: string;
  filename: string;
  mediaType: string;
  /** Local object URL for the thumbnail while/after uploading. */
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  /** Remote public URL once the upload resolves. */
  url?: string;
  error?: string;
}

function isImage(type: string): boolean {
  return type.startsWith("image/");
}

export interface UseImageAttachments {
  attachments: PendingAttachment[];
  /** True while any attachment is still uploading. */
  uploading: boolean;
  addFiles: (files: FileList | File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Ready attachments as AI SDK file parts for the outgoing message. */
  getFileParts: () => FileUIPart[];
}

/**
 * Image attachment state for the chat composer. Each added image uploads to
 * `/api/chat/upload` (Supabase Storage) and, once ready, contributes a
 * `FileUIPart` (remote URL) to the outgoing message.
 */
export function useImageAttachments(projectId: string): UseImageAttachments {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  const upload = useCallback(
    async (id: string, file: File) => {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("projectId", projectId);
        const res = await fetch("/api/chat/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { url: string; mediaType: string };
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "ready", url: data.url, mediaType: data.mediaType }
              : a,
          ),
        );
      } catch (e) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "error",
                  error: e instanceof Error ? e.message : "업로드 실패",
                }
              : a,
          ),
        );
      }
    },
    [projectId],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => isImage(f.type));
      for (const file of list) {
        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        setAttachments((prev) => [
          ...prev,
          {
            id,
            filename: file.name,
            mediaType: file.type,
            previewUrl,
            status: "uploading",
          },
        ]);
        void upload(id, file);
      }
    },
    [upload],
  );

  const remove = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachments((prev) => {
      for (const a of prev) URL.revokeObjectURL(a.previewUrl);
      return [];
    });
  }, []);

  const getFileParts = useCallback((): FileUIPart[] => {
    return attachments
      .filter((a) => a.status === "ready" && a.url)
      .map((a) => ({
        type: "file" as const,
        filename: a.filename,
        mediaType: a.mediaType,
        url: a.url!,
      }));
  }, [attachments]);

  const uploading = attachments.some((a) => a.status === "uploading");

  return {
    attachments,
    uploading,
    addFiles,
    remove,
    clear,
    getFileParts,
  };
}
