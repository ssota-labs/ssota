import { requireAuthContext } from "./auth-context";
import { jsonError } from "./response";

export async function withAuth(
  request: Request,
  handler: (ctx: NonNullable<Awaited<ReturnType<typeof requireAuthContext>>>) => Promise<Response>,
): Promise<Response> {
  const ctx = await requireAuthContext(request);
  if (!ctx) {
    return jsonError("UNAUTHORIZED", "Bearer token required", 401);
  }
  return handler(ctx);
}
