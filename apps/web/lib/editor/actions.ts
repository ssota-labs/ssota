"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { getGraphPorts } from "@/lib/ports";
import { uploadEditorAsset } from "@/lib/editor/storage";

export async function searchMentionNodesAction(input: {
  teamspaceId: string;
  query: string;
}): Promise<{
  ok: boolean;
  items: Array<{ id: string; label: string; nodeType: string }>;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, items: [], error: "Unauthorized" };

  const query = input.query.trim().toLowerCase();
  const { graphRead } = await getGraphPorts(input.teamspaceId);
  const nodes = await graphRead.queryNodes({ teamspaceId: input.teamspaceId, limit: 80 });
  const items = nodes
    .map((node) => {
      const title = String(
        node.properties.title ??
          node.properties.name ??
          node.properties.label ??
          node.title ??
          node.id,
      );
      return {
        id: node.id,
        label: title,
        nodeType: node.catalogKey,
      };
    })
    .filter((item) => {
      if (!query) return true;
      return (
        item.label.toLowerCase().includes(query) ||
        item.nodeType.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    })
    .slice(0, 8);

  return { ok: true, items };
}

export async function uploadEditorImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const teamspaceId = String(formData.get("teamspaceId") ?? "").trim();
  const file = formData.get("file");
  if (!teamspaceId) return { ok: false, error: "teamspaceId required" };
  if (!(file instanceof File)) return { ok: false, error: "file required" };
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Only image uploads are supported" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be 5MB or smaller" };
  }

  try {
    const url = await uploadEditorAsset(teamspaceId, file);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
