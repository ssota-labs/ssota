import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StudioBuildStorageArtifact = {
  path: string;
  body: Uint8Array;
  contentType: string;
};

export type StudioBuildStorageDownload = {
  body: Uint8Array;
  contentType: string;
};

export type StudioBuildStorage = {
  exists(projectId: string, buildHash: string): Promise<boolean>;
  upload(
    projectId: string,
    buildHash: string,
    artifacts: StudioBuildStorageArtifact[],
  ): Promise<void>;
  download(storagePath: string): Promise<StudioBuildStorageDownload | null>;
  getSignedPreviewUrl(storagePath: string, ttlSeconds: number): Promise<string>;
};

function artifactPaths(projectId: string, buildHash: string) {
  const base = `${projectId}/studio-builds/${buildHash}`;
  return {
    jsPath: `${base}/bundle.js`,
    cssPath: `${base}/bundle.css`,
    mapPath: `${base}/bundle.js.map`,
  };
}

export class LocalStudioBuildStorage implements StudioBuildStorage {
  constructor(private readonly rootDir: string) {}

  private buildDir(projectId: string, buildHash: string) {
    return path.join(this.rootDir, projectId, "studio-builds", buildHash);
  }

  async exists(projectId: string, buildHash: string): Promise<boolean> {
    try {
      await readFile(
        path.join(this.buildDir(projectId, buildHash), "bundle.js"),
      );
      return true;
    } catch {
      return false;
    }
  }

  async upload(
    projectId: string,
    buildHash: string,
    artifacts: StudioBuildStorageArtifact[],
  ): Promise<void> {
    const dir = this.buildDir(projectId, buildHash);
    await mkdir(dir, { recursive: true });
    for (const artifact of artifacts) {
      const fileName = path.basename(artifact.path);
      await writeFile(path.join(dir, fileName), artifact.body);
    }
  }

  async download(storagePath: string): Promise<StudioBuildStorageDownload | null> {
    try {
      const absolute = path.join(this.rootDir, storagePath);
      const body = await readFile(absolute);
      const fileName = path.basename(storagePath);
      const contentType =
        fileName.endsWith(".css")
          ? "text/css"
          : fileName.endsWith(".map")
            ? "application/json"
            : "text/javascript";
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async getSignedPreviewUrl(
    storagePath: string,
    _ttlSeconds: number,
  ): Promise<string> {
    const absolute = path.join(this.rootDir, storagePath);
    return `file://${absolute}`;
  }
}

export class SupabaseStudioBuildStorage implements StudioBuildStorage {
  private readonly bucket = "studio-builds";

  constructor(private readonly client: SupabaseClient) {}

  async exists(projectId: string, buildHash: string): Promise<boolean> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(`${projectId}/studio-builds/${buildHash}`, {
        search: "bundle.js",
      });
    if (error) {
      return false;
    }
    return (data ?? []).some((item) => item.name === "bundle.js");
  }

  async upload(
    projectId: string,
    buildHash: string,
    artifacts: StudioBuildStorageArtifact[],
  ): Promise<void> {
    for (const artifact of artifacts) {
      const { error } = await this.client.storage
        .from(this.bucket)
        .upload(artifact.path, artifact.body, {
          contentType: artifact.contentType,
          upsert: true,
        });
      if (error) {
        throw new Error(`Failed to upload ${artifact.path}: ${error.message}`);
      }
    }
  }

  async download(storagePath: string): Promise<StudioBuildStorageDownload | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(storagePath);
    if (error || !data) {
      return null;
    }
    const fileName = path.posix.basename(storagePath);
    const contentType =
      fileName.endsWith(".css")
        ? "text/css"
        : fileName.endsWith(".map")
          ? "application/json"
          : "text/javascript";
    const body = new Uint8Array(await data.arrayBuffer());
    return { body, contentType };
  }

  async getSignedPreviewUrl(
    storagePath: string,
    ttlSeconds: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, ttlSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Failed to create signed URL");
    }
    return data.signedUrl;
  }
}

export function createStudioBuildStorage(options?: {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  localRoot?: string;
}): StudioBuildStorage {
  const mode = process.env.STUDIO_BUILD_STORAGE ?? "auto";
  const supabaseUrl = options?.supabaseUrl ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    options?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    mode === "local" ||
    !supabaseUrl ||
    !serviceRoleKey ||
    mode === "filesystem"
  ) {
    return new LocalStudioBuildStorage(
      options?.localRoot ??
        process.env.STUDIO_BUILD_LOCAL_ROOT ??
        "/tmp/studio-builds",
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseStudioBuildStorage(client);
}

export { artifactPaths as studioBuildArtifactPaths };
