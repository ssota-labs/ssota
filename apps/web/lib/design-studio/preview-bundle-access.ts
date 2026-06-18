import { createHmac, timingSafeEqual } from "node:crypto";

const ACCESS_TTL_SECONDS = 3600;

type PreviewBundleAccessPayload = {
  projectId: string;
  buildHash: string;
  fileName: string;
  exp: number;
};

function accessSecret(): string {
  return (
    process.env.STUDIO_PREVIEW_ACCESS_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.DATABASE_URL ??
    "studio-preview-dev-secret"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", accessSecret()).update(payload).digest("base64url");
}

function encodeToken(payload: PreviewBundleAccessPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(body);
  return `${body}.${signature}`;
}

function decodeToken(token: string): PreviewBundleAccessPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = signPayload(body);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as PreviewBundleAccessPayload;
    if (
      typeof parsed.projectId !== "string" ||
      typeof parsed.buildHash !== "string" ||
      typeof parsed.fileName !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createPreviewBundleAccessToken(input: {
  projectId: string;
  buildHash: string;
  fileName: string;
}): string {
  return encodeToken({
    projectId: input.projectId,
    buildHash: input.buildHash,
    fileName: input.fileName,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  });
}

export function verifyPreviewBundleAccessToken(
  token: string | null | undefined,
  expected: { projectId: string; buildHash: string; fileName: string },
): boolean {
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;
  return (
    payload.projectId === expected.projectId &&
    payload.buildHash === expected.buildHash &&
    payload.fileName === expected.fileName
  );
}
