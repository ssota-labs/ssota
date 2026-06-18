import { NextResponse } from "next/server";
import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import { verifyPreviewBundleAccessToken } from "@/lib/design-studio/preview-bundle-access";
import {
  contentTypeForPreviewBundleFile,
  isPreviewBundleFile,
} from "@/lib/design-studio/preview-bundle-url";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteParams = {
  projectId: string;
  buildHash: string;
  fileName: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { projectId, buildHash, fileName } = await context.params;
  if (!isPreviewBundleFile(fileName)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = new URL(request.url).searchParams.get("access");
  const hasAccessToken = verifyPreviewBundleAccessToken(access, {
    projectId,
    buildHash,
    fileName,
  });
  if (!hasAccessToken) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const paths = studioBuildArtifactPaths(projectId, buildHash);
  const storagePath =
    fileName === "bundle.js"
      ? paths.jsPath
      : fileName === "bundle.css"
        ? paths.cssPath
        : paths.mapPath;

  const storage = createStudioBuildStorage();
  const body = await storage.readArtifact(storagePath);
  if (!body) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(body), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForPreviewBundleFile(fileName),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
