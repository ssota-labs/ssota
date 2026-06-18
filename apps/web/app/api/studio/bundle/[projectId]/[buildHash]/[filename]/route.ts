import { NextResponse } from "next/server";
import { z } from "zod";
import { createStudioBuildStorage } from "@ssota/adapter-supabase";
import { resolveStudioBundleStoragePath } from "@/lib/studio/bundle-proxy";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  buildHash: z.string().regex(/^[a-f0-9]{32}$/),
  filename: z.enum(["bundle.js", "bundle.css"]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; buildHash: string; filename: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let params: z.infer<typeof paramsSchema>;
  try {
    params = paramsSchema.parse(await context.params);
  } catch {
    return NextResponse.json({ error: "Invalid bundle path" }, { status: 400 });
  }

  const storagePath = resolveStudioBundleStoragePath(
    params.projectId,
    params.buildHash,
    params.filename,
  );
  if (!storagePath) {
    return NextResponse.json({ error: "Invalid bundle path" }, { status: 400 });
  }

  const storage = createStudioBuildStorage();
  const artifact = await storage.download(storagePath);
  if (!artifact) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(artifact.body), {
    status: 200,
    headers: {
      "Content-Type": artifact.contentType,
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
