import { createClient } from "@supabase/supabase-js";

const EDITOR_ASSETS_BUCKET = "editor-assets";

function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin credentials are not configured");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadEditorAsset(
  teamspaceId: string,
  file: File,
): Promise<string> {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "bin";
  const objectPath = `${teamspaceId}/${crypto.randomUUID()}.${extension}`;
  const supabase = createSupabaseAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(EDITOR_ASSETS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(EDITOR_ASSETS_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}
