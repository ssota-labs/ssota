import { createProjectAuthHandler } from "@/lib/mcp/create-handlers";

type RouteContext = {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
};

const handlerCache = new Map<
  string,
  (req: Request) => Promise<Response>
>();

function getProjectAuthHandler(orgSlug: string, projectSlug: string) {
  const key = `${orgSlug}/${projectSlug}`;
  let handler = handlerCache.get(key);
  if (!handler) {
    handler = createProjectAuthHandler(orgSlug, projectSlug);
    handlerCache.set(key, handler);
  }
  return handler;
}

async function handler(
  req: Request,
  context: RouteContext,
): Promise<Response> {
  const { orgSlug, projectSlug } = await context.params;
  return getProjectAuthHandler(orgSlug, projectSlug)(req);
}

export async function GET(req: Request, context: RouteContext) {
  return handler(req, context);
}

export async function POST(req: Request, context: RouteContext) {
  return handler(req, context);
}
