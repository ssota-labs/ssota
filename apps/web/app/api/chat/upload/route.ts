import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Supabase Storage bucket for chat attachments (must exist + be public). */
const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PREFIXES = ["image/"];

function extensionFor(type: string, name: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : undefined;
  if (fromName) return fromName.toLowerCase();
  const sub = type.split("/")[1];
  return sub ? sub.toLowerCase() : "bin";
}

/**
 * Upload a chat attachment to Supabase Storage and return its public URL. The
 * URL is embedded as a `FileUIPart` in the outgoing message so the agent (and
 * AI Gateway) can fetch the image.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const teamspaceId = String(form?.get("teamspaceId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 413 },
    );
  }
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}` },
      { status: 415 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const ext = extensionFor(file.type, file.name);
  const path = `${teamspaceId || "shared"}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json(
      { error: "Upload failed", detail: error.message },
      { status: 502 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    url: publicUrl,
    mediaType: file.type,
    filename: file.name,
  });
}
