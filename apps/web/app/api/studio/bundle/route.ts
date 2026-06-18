import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const querySchema = z.object({
  projectId: z.string().uuid(),
  buildHash: z.string().min(8).max(128),
  file: z.enum(["bundle.js", "bundle.css"]),
});

const CONTENT_TYPES: Record<"bundle.js" | "bundle.css", string> = {
  "bundle.js": "text/javascript; charset=utf-8",
  "bundle.css": "text/css; charset=utf-8",
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse({
      projectId: url.searchParams.get("projectId"),
      buildHash: url.searchParams.get("buildHash"),
      file: url.searchParams.get("file"),
    });
  } catch {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const paths = studioBuildArtifactPaths(query.projectId, query.buildHash);
  const storagePath =
    query.file === "bundle.css" ? paths.cssPath : paths.jsPath;

  const storage = createStudioBuildStorage();
  const body = await storage.download(storagePath);
  if (!body) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(body), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[query.file],
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
