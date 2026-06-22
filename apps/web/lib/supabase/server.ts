import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// `getCurrentUser` is the app-wide auth seam; it delegates to the configured
// AuthProvider (local for OSS, Supabase for Enterprise). Re-exported here so the
// many existing `@/lib/supabase/server` imports keep working.
export { getCurrentUser } from "@/lib/auth/provider";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    },
  );
}
