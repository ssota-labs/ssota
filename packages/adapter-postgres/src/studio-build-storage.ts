import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StudioBuildStorageArtifact = {
  path: string;
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
  readArtifact(storagePath: string): Promise<Uint8Array | null>;
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

  async readArtifact(storagePath: string): Promise<Uint8Array | null> {
    try {
      const absolute = path.join(this.rootDir, storagePath);
      const data = await readFile(absolute);
      return new Uint8Array(data);
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

  async readArtifact(storagePath: string): Promise<Uint8Array | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(storagePath);
    if (error || !data) {
      return null;
    }
    const buffer = await data.arrayBuffer();
    return new Uint8Array(buffer);
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

/** S3-compatible config (AWS S3, MinIO, R2, …). Endpoint is optional (AWS default). */
export interface S3StudioBuildStorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Path-style addressing — required by MinIO and most self-hosted gateways. */
  forcePathStyle?: boolean;
}

/**
 * S3-compatible storage (AWS S3, MinIO, Cloudflare R2, …). The AWS SDK is loaded
 * lazily so it stays an optional dependency — only self-hosters who pick
 * `STUDIO_BUILD_STORAGE=s3` need it installed.
 */
export class S3StudioBuildStorage implements StudioBuildStorage {
  private client: unknown;

  constructor(private readonly config: S3StudioBuildStorageConfig) {}

  private async getClient(): Promise<{
    send: (command: unknown) => Promise<unknown>;
  }> {
    if (!this.client) {
      let mod: {
        S3Client: new (config: unknown) => { send: (c: unknown) => Promise<unknown> };
      };
      try {
        mod = (await import("@aws-sdk/client-s3")) as unknown as typeof mod;
      } catch {
        throw new Error(
          "@aws-sdk/client-s3 is not installed — add it to use S3 storage",
        );
      }
      this.client = new mod.S3Client({
        region: this.config.region ?? process.env.AWS_REGION ?? "us-east-1",
        ...(this.config.endpoint ? { endpoint: this.config.endpoint } : {}),
        ...(this.config.forcePathStyle ? { forcePathStyle: true } : {}),
        ...(this.config.accessKeyId && this.config.secretAccessKey
          ? {
              credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
              },
            }
          : {}),
      });
    }
    return this.client as { send: (command: unknown) => Promise<unknown> };
  }

  private async commands(): Promise<{
    GetObjectCommand: new (input: unknown) => unknown;
    PutObjectCommand: new (input: unknown) => unknown;
    HeadObjectCommand: new (input: unknown) => unknown;
  }> {
    return (await import("@aws-sdk/client-s3")) as unknown as {
      GetObjectCommand: new (input: unknown) => unknown;
      PutObjectCommand: new (input: unknown) => unknown;
      HeadObjectCommand: new (input: unknown) => unknown;
    };
  }

  async exists(projectId: string, buildHash: string): Promise<boolean> {
    const { jsPath } = artifactPaths(projectId, buildHash);
    const client = await this.getClient();
    const { HeadObjectCommand } = await this.commands();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: jsPath }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async upload(
    _projectId: string,
    _buildHash: string,
    artifacts: StudioBuildStorageArtifact[],
  ): Promise<void> {
    const client = await this.getClient();
    const { PutObjectCommand } = await this.commands();
    for (const artifact of artifacts) {
      await client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: artifact.path,
          Body: artifact.body,
          ContentType: artifact.contentType,
        }),
      );
    }
  }

  async readArtifact(storagePath: string): Promise<Uint8Array | null> {
    const client = await this.getClient();
    const { GetObjectCommand } = await this.commands();
    try {
      const res = (await client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: storagePath }),
      )) as { Body?: { transformToByteArray?: () => Promise<Uint8Array> } };
      const body = res.Body;
      if (!body?.transformToByteArray) return null;
      return await body.transformToByteArray();
    } catch {
      return null;
    }
  }

  async getSignedPreviewUrl(
    storagePath: string,
    ttlSeconds: number,
  ): Promise<string> {
    const client = await this.getClient();
    const { GetObjectCommand } = await this.commands();
    const { getSignedUrl } = (await import(
      "@aws-sdk/s3-request-presigner"
    )) as unknown as {
      getSignedUrl: (
        client: unknown,
        command: unknown,
        options: { expiresIn: number },
      ) => Promise<string>;
    };
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: storagePath }),
      { expiresIn: ttlSeconds },
    );
  }
}

function s3ConfigFromEnv(): S3StudioBuildStorageConfig | null {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) return null;
  return {
    bucket,
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
  };
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
  const s3Config = s3ConfigFromEnv();

  // Explicit filesystem/local, or no remote backend configured → local.
  if (
    mode === "local" ||
    mode === "filesystem" ||
    (mode === "auto" && !s3Config && (!supabaseUrl || !serviceRoleKey))
  ) {
    return new LocalStudioBuildStorage(
      options?.localRoot ??
        process.env.STUDIO_BUILD_LOCAL_ROOT ??
        "/tmp/studio-builds",
    );
  }

  // S3-compatible (self-host default remote): explicit `s3` or auto with S3 env.
  if (mode === "s3" || (mode === "auto" && s3Config)) {
    if (!s3Config) {
      throw new Error("STUDIO_BUILD_STORAGE=s3 requires S3_BUCKET (+ S3_* env)");
    }
    return new S3StudioBuildStorage(s3Config);
  }

  const client = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseStudioBuildStorage(client);
}

export { artifactPaths as studioBuildArtifactPaths };
