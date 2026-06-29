import { cache } from "react";
import type { NextRequest } from "next/server";
import { createLocalAuthProvider } from "./local-auth";
import type { AuthProvider, AuthUser } from "./types";

export type { AuthProvider, AuthUser } from "./types";

let cached: AuthProvider | undefined;

function selectMode(): "local" | "supabase" {
  const explicit = process.env.AUTH;
  if (explicit === "local" || explicit === "supabase") return explicit;
  // Auto-detect: a configured Supabase URL implies the Enterprise provider;
  // otherwise fall back to the OSS local provider.
  return process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local";
}

/** Resolve the configured auth provider (cached). Set `AUTH=local|supabase`. */
export async function getAuthProvider(): Promise<AuthProvider> {
  if (cached) return cached;

  if (selectMode() === "supabase") {
    // Lazy import keeps Supabase (Enterprise) off the OSS code path.
    const mod = await import("./supabase-auth.ee");
    cached = mod.createSupabaseAuthProvider();
  } else {
    cached = createLocalAuthProvider();
  }
  return cached;
}

/**
 * The authenticated user for the current request, or null. `cache()` dedups
 * the lookup within a single request/render. This is the app-wide auth seam —
 * callers should not import a provider-specific client.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const provider = await getAuthProvider();
    return await provider.getCurrentUser();
  } catch (error) {
    // Supabase docker 미기동·일시적 네트워크 장애 시 랜딩/레이아웃이 죽지 않게 한다.
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[auth] getCurrentUser failed; treating request as signed out:",
        error,
      );
    }
    return null;
  }
});

/** Proxy/middleware session refresh, delegated to the configured provider. */
export async function updateSession(request: NextRequest) {
  const provider = await getAuthProvider();
  return provider.updateSession(request);
}
