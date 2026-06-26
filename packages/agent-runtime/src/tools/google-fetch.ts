/**
 * Minimal fetch helper shared by the Google REST connectors (Gmail, Drive,
 * Calendar). Keeps the connectors dependency-free — no `googleapis` SDK — by
 * calling the Google REST endpoints directly with the OAuth bearer token that
 * Vercel Connect mints (injected as `ctx.token`).
 */

type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface GapiOptions {
  /**
   * Query params appended to the URL (undefined/null/"" values are skipped).
   * Array values become repeated params (e.g. Gmail `labelIds`,
   * `metadataHeaders` are repeated, not comma-joined).
   */
  query?: Record<string, QueryValue>;
  /** JSON request body (sent with Content-Type: application/json). */
  body?: unknown;
}

function buildUrl(url: string, query?: GapiOptions["query"]): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

/**
 * Call a Google REST API endpoint with a bearer token. Throws an Error with a
 * normalized message (including Google's error detail when present) on non-2xx.
 */
export async function gapi(
  token: string,
  method: string,
  url: string,
  options: GapiOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  let bodyInit: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(options.body);
  }

  const res = await fetch(buildUrl(url, options.query), {
    method,
    headers,
    ...(bodyInit !== undefined ? { body: bodyInit } : {}),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "error" in parsed
        ? extractGoogleError((parsed as { error: unknown }).error)
        : typeof parsed === "string" && parsed
          ? parsed
          : res.statusText;
    throw new Error(`Google API ${res.status}: ${detail}`);
  }

  return parsed;
}

function extractGoogleError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; status?: unknown };
    if (typeof e.message === "string") return e.message;
    if (typeof e.status === "string") return e.status;
  }
  return "unknown error";
}

/** Encode a UTF-8 string to base64url (Gmail raw message / Drive ids use this). */
export function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode base64url (as Gmail returns message body parts) to a UTF-8 string. */
export function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}
