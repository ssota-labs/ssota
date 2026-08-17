import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { SMOKE_EMAIL, SMOKE_PASSWORD } from "@ssota/adapter-postgres";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const MAX_CHUNK = 3180;

function authCookieName(url: string): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function chunkCookie(name: string, value: string): { name: string; value: string }[] {
  if (value.length <= MAX_CHUNK) {
    return [{ name, value }];
  }
  const chunks: { name: string; value: string }[] = [];
  for (let i = 0, n = 0; i < value.length; i += MAX_CHUNK, n += 1) {
    chunks.push({ name: `${name}.${n}`, value: value.slice(i, i + MAX_CHUNK) });
  }
  return chunks;
}

/**
 * UI 로그인 없이 smoke 세션 쿠키만 심는다.
 * 폼 submit은 next dev 콜드 컴파일과 묶여 테스트마다 1–3분이 걸린다.
 */
export async function applySmokeSession(page: Page): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Smoke API login failed: ${error?.message ?? "no session"}`);
  }

  const encoded = `base64-${toBase64Url(JSON.stringify(data.session))}`;
  const cookies = chunkCookie(authCookieName(supabaseUrl), encoded).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  await page.context().addCookies(cookies);
}
