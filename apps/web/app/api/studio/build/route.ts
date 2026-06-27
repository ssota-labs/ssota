import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUiComponentFromProperties } from "@ssota/contracts/catalog";
import { studioPreviewBundleUrl } from "@/lib/design-studio/preview-bundle-url";
import { resolveBuildContext } from "@/lib/design-studio/resolve-build-context";
import { resolveProjectTheme } from "@/lib/design-studio/resolve-project-theme";
import { resolveProjectToolchain } from "@/lib/design-studio/resolve-project-toolchain";
import { runStudioBuildAndCache } from "@/lib/design-studio/run-studio-build";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const inlineBuildBodySchema = z.object({
  teamspaceId: z.string().uuid(),
  properties: z.record(z.unknown()),
});

const componentBuildBodySchema = z.object({
  teamspaceId: z.string().uuid(),
  componentId: z.string().uuid(),
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

  const startedAt = Date.now();

  try {
    const [{ themeCss }, toolchain] = await Promise.all([
      resolveProjectTheme(body.teamspaceId),
      resolveProjectToolchain(body.teamspaceId),
    ]);

    if ("componentId" in body) {
      const deps = getGraphDeps(body.teamspaceId);
      const node = await deps.graphRead.getNode({
        teamspaceId: body.teamspaceId,
        nodeId: body.componentId,
      });
      if (!node || node.catalogKey !== "ui_component") {
        return NextResponse.json({ error: "Component not found" }, { status: 404 });
      }

      const representation =
        (node.properties.representation as "source" | undefined) ?? "source";
      if (representation !== "source") {
        return NextResponse.json(
          { error: "Only source representation components can be built" },
          { status: 400 },
        );
      }

      const buildContext = resolveBuildContext({
        teamspaceId: body.teamspaceId,
        node,
        packageJson: toolchain.packageJson,
        lockfile: toolchain.lockfile,
        themeCss,
      });

      const { build, cacheHit } = await runStudioBuildAndCache({
        teamspaceId: body.teamspaceId,
        buildContext,
      });

      const jsUrl = studioPreviewBundleUrl(
        body.teamspaceId,
        build.buildHash,
        "bundle.js",
      );
      const cssUrl = build.artifacts.css
        ? studioPreviewBundleUrl(body.teamspaceId, build.buildHash, "bundle.css")
        : undefined;

      return NextResponse.json({
        buildId: build.buildHash,
        buildHash: build.buildHash,
        url: jsUrl,
        cssUrl,
        cacheHit,
        buildMs: Date.now() - startedAt,
        bundleBytes: build.artifacts.js.byteLength,
      });
    }

    const parsedContent = parseUiComponentFromProperties(body.properties, "source");
    const entry =
      typeof body.properties.entry === "string" && body.properties.entry.trim()
        ? body.properties.entry
        : "Component.tsx";

    const buildContext = resolveBuildContext({
      teamspaceId: body.teamspaceId,
      node: {
        id: "inline",
        teamspaceId: body.teamspaceId,
        nodeCatalogId: "inline",
        catalogKey: "ui_component",
        catalogLabel: "UI component",
        title: "inline",
        properties: {
          ...body.properties,
          entry,
          files: parsedContent.files,
          layerIndex: parsedContent.layerIndex,
        },
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      packageJson: toolchain.packageJson,
      lockfile: toolchain.lockfile,
      themeCss,
      contentV2: parsedContent,
    });

    const { build, cacheHit } = await runStudioBuildAndCache({
      teamspaceId: body.teamspaceId,
      buildContext,
    });

    const jsUrl = studioPreviewBundleUrl(
      body.teamspaceId,
      build.buildHash,
      "bundle.js",
    );
    const cssUrl = build.artifacts.css
      ? studioPreviewBundleUrl(body.teamspaceId, build.buildHash, "bundle.css")
      : undefined;

    return NextResponse.json({
      buildId: build.buildHash,
      buildHash: build.buildHash,
      url: jsUrl,
      cssUrl,
      cacheHit,
      buildMs: Date.now() - startedAt,
      bundleBytes: build.artifacts.js.byteLength,
    });
  } catch (error) {
    console.error("studio build failed", error);
    const message = error instanceof Error ? error.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
