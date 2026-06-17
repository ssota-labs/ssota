"use client";

import type { SsotaMentionItem } from "@ssota/editor";
import {
  searchMentionNodesAction,
  uploadEditorImageAction,
} from "@/app/actions";

export function createSsotaEditorHostProps(projectId: string) {
  return {
    mentionSearch: async (query: string): Promise<SsotaMentionItem[]> => {
      const result = await searchMentionNodesAction({ projectId, query });
      return result.ok ? result.items : [];
    },
    uploadImage: async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("file", file);
      const result = await uploadEditorImageAction(formData);
      if (!result.ok || !result.url) {
        throw new Error(result.error ?? "Image upload failed");
      }
      return result.url;
    },
  };
}
