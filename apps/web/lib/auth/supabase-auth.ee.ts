import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthProvider, AuthUser } from "./types";

/**
 * ENTERPRISE (.ee) — Supabase Auth provider.
 *
 * Licensed under LICENSE_EE.md. Selected by `AUTH=supabase` (or auto-detected
 * when `NEXT_PUBLIC_SUPABASE_URL` is set). Provides cookie-based sessions,
 * OAuth, and multi-user auth.
 */
export function createSupabaseAuthProvider(): AuthProvider {
  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user
        ? { id: data.user.id, email: data.user.email ?? null }
        : null;
    },

    async signOut(): Promise<void> {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    },

    async updateSession(request: NextRequest): Promise<NextResponse> {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(
        "x-pathname",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );

      let supabaseResponse = NextResponse.next({
        request: { headers: requestHeaders },
      });

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(
              cookiesToSet: {
                name: string;
                value: string;
                options?: Parameters<typeof supabaseResponse.cookies.set>[2];
              }[],
            ) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value),
              );
              supabaseResponse = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
              );
            },
          },
        },
      );

      try {
        await supabase.auth.getUser();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[auth] updateSession getUser failed; continuing without refresh:",
            error,
          );
        }
      }

      return supabaseResponse;
    },
  };
}
