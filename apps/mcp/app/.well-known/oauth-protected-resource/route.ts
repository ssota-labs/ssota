import { protectedResourceHandler } from "mcp-handler";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export const GET = protectedResourceHandler({
  authServerUrls: [supabaseUrl],
  resourceUrl: process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
});
