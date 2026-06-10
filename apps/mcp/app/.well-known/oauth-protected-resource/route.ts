export async function GET() {
  const resourceUrl =
    process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp";
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

  return Response.json({
    resource: resourceUrl,
    authorization_servers: [supabaseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile"],
  });
}
