import { protectedResourceHandler } from "mcp-handler";
import { supabaseAuthIssuerUrl } from "@/lib/auth";

export const GET = protectedResourceHandler({
  authServerUrls: [supabaseAuthIssuerUrl()],
  resourceUrl: process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
});
