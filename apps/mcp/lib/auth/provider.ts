import { createLocalMcpAuthProvider } from "./local-auth";
import type { AuthUser, McpAuthProvider } from "./types";

export type { AuthUser } from "./types";

let cached: McpAuthProvider | undefined;

function selectMode(): "local" | "supabase" {
  const explicit = process.env.AUTH;
  if (explicit === "local" || explicit === "supabase") return explicit;
  return process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local";
}

/** Resolve the configured MCP auth provider (cached). Set `AUTH=local|supabase`. */
export async function getMcpAuthProvider(): Promise<McpAuthProvider> {
  if (cached) return cached;

  if (selectMode() === "supabase") {
    // Lazy import keeps Supabase (Enterprise) off the OSS code path.
    const mod = await import("./supabase-auth.ee");
    cached = mod.createSupabaseMcpAuthProvider();
  } else {
    cached = createLocalMcpAuthProvider();
  }
  return cached;
}

/** Verify a bearer token via the configured provider. */
export async function verifyBearerToken(
  authorization: string | null,
): Promise<AuthUser | null> {
  const provider = await getMcpAuthProvider();
  return provider.verifyBearerToken(authorization);
}

/** Authorization servers to advertise in the protected-resource metadata. */
export async function authServerUrls(): Promise<string[]> {
  const provider = await getMcpAuthProvider();
  return provider.authServerUrls();
}
