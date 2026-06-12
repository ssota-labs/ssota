export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">SSOTA MCP Server</h1>
      <p className="text-neutral-600">
        Account MCP: <code>/api/mcp</code> (list_organizations, list_projects)
      </p>
      <p className="text-neutral-600">
        Project MCP: <code>/api/mcp?org=&#123;orgSlug&#125;&amp;project=&#123;projectSlug&#125;</code>{" "}
        (graph, catalog, execute_action)
      </p>
      <p className="text-neutral-600">
        OAuth consent is hosted on the SSOTA Console (web app).
      </p>
    </main>
  );
}
