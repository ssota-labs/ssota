import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import {
  parseUiComponentContent,
  uiComponentContentSchemaV2,
} from "@ssota/contracts/catalog";
import { buildStudioPreview } from "@ssota/studio-build";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const inlineBuildBodySchema = z.object({
  projectId: z.string().uuid(),
  properties: z.record(z.unknown()),
  content: z.string().min(1),
  themeCss: z.string().optional(),
});

const componentBuildBodySchema = z.object({
  projectId: z.string().uuid(),
  componentId: z.string().uuid(),
  themeCss: z.string().optional(),
});

const requestBodySchema = z.union([
  inlineBuildBodySchema,
  componentBuildBodySchema,
]);

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof requestBodySchema>;
  try {
    body = requestBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const storage = createStudioBuildStorage();
  const startedAt = Date.now();

  try {
    if ("componentId" in body) {
      const deps = getGraphDeps(body.projectId);
      const node = await deps.graphRead.getNode({
        projectId: body.projectId,
        nodeId: body.componentId,
      });
      if (!node || node.nodeType !== "ui_component") {
        return NextResponse.json({ error: "Component not found" }, { status: 404 });
      }

      const representation =
        (node.properties.representation as "source" | "tree" | undefined) ??
        "tree";
      if (representation !== "source") {
        return NextResponse.json(
          { error: "Only source representation components can be built" },
          { status: 400 },
        );
      }

      const content = parseUiComponentContent(node.content, "source");
      if (content.schemaVersion !== 2) {
        return NextResponse.json(
          { error: "Component content must be schemaVersion 2" },
          { status: 400 },
        );
      }

      const entry = typeof node.properties.entry === "string"
        ? node.properties.entry
        : undefined;
      if (!entry) {
        return NextResponse.json({ error: "Component entry is missing" }, { status: 400 });
      }

      const dependencies =
        node.properties.dependencies &&
        typeof node.properties.dependencies === "object"
          ? (node.properties.dependencies as Record<string, string>)
          : {};

      const buildHashPreview = await buildStudioPreview({
        projectId: body.projectId,
        entry,
        files: content.files,
        dependencies,
        themeCss: body.themeCss,
        studioRuntimeInject: true,
      });

      const paths = studioBuildArtifactPaths(
        body.projectId,
        buildHashPreview.buildHash,
      );
      const cacheHit = await storage.exists(
        body.projectId,
        buildHashPreview.buildHash,
      );

      if (!cacheHit) {
        const artifacts = [
          {
            path: paths.jsPath,
            body: buildHashPreview.artifacts.js,
            contentType: "text/javascript",
          },
        ];
        if (buildHashPreview.artifacts.css) {
          artifacts.push({
            path: paths.cssPath,
            body: buildHashPreview.artifacts.css,
            contentType: "text/css",
          });
        }
        if (buildHashPreview.artifacts.map) {
          artifacts.push({
            path: paths.mapPath,
            body: buildHashPreview.artifacts.map,
            contentType: "application/json",
          });
        }
        await storage.upload(
          body.projectId,
          buildHashPreview.buildHash,
          artifacts,
        );
      }

      const [jsUrl, cssUrl] = await Promise.all([
        storage.getSignedPreviewUrl(paths.jsPath, 3600),
        buildHashPreview.artifacts.css
          ? storage.getSignedPreviewUrl(paths.cssPath, 3600)
          : Promise.resolve(undefined),
      ]);

      return NextResponse.json({
        buildId: buildHashPreview.buildHash,
        buildHash: buildHashPreview.buildHash,
        url: jsUrl,
        cssUrl,
        cacheHit,
        buildMs: Date.now() - startedAt,
        bundleBytes: buildHashPreview.artifacts.js.byteLength,
      });
    }

    const parsedContent = uiComponentContentSchemaV2.parse(
      JSON.parse(body.content),
    );
    const properties = body.properties;
    const entry = typeof properties.entry === "string" ? properties.entry : null;
    if (!entry) {
      return NextResponse.json({ error: "properties.entry is required" }, { status: 400 });
    }

    const dependencies =
      properties.dependencies && typeof properties.dependencies === "object"
        ? (properties.dependencies as Record<string, string>)
        : {};

    const buildResult = await buildStudioPreview({
      projectId: body.projectId,
      entry,
      files: parsedContent.files,
      dependencies,
      themeCss: body.themeCss,
      studioRuntimeInject: true,
    });

    const paths = studioBuildArtifactPaths(body.projectId, buildResult.buildHash);
    const cacheHit = await storage.exists(body.projectId, buildResult.buildHash);

    if (!cacheHit) {
      const artifacts = [
        {
          path: paths.jsPath,
          body: buildResult.artifacts.js,
          contentType: "text/javascript",
        },
      ];
      if (buildResult.artifacts.css) {
        artifacts.push({
          path: paths.cssPath,
          body: buildResult.artifacts.css,
          contentType: "text/css",
        });
      }
      if (buildResult.artifacts.map) {
        artifacts.push({
          path: paths.mapPath,
          body: buildResult.artifacts.map,
          contentType: "application/json",
        });
      }
      await storage.upload(body.projectId, buildResult.buildHash, artifacts);
    }

    const [jsUrl, cssUrl] = await Promise.all([
      storage.getSignedPreviewUrl(paths.jsPath, 3600),
      buildResult.artifacts.css
        ? storage.getSignedPreviewUrl(paths.cssPath, 3600)
        : Promise.resolve(undefined),
    ]);

    return NextResponse.json({
      buildId: buildResult.buildHash,
      buildHash: buildResult.buildHash,
      url: jsUrl,
      cssUrl,
      cacheHit,
      buildMs: Date.now() - startedAt,
      bundleBytes: buildResult.artifacts.js.byteLength,
    });
  } catch (error) {
    console.error("studio build failed", error);
    const message = error instanceof Error ? error.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
