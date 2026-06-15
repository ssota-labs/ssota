import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { CopyButton } from "@/components/developer/copy-button";
import { PageHeader } from "@/components/studio/page-header";
import { getSiteUrl } from "@/lib/auth/config";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DeveloperSetupPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const siteUrl = getSiteUrl();
  const hostedMcpUrl = `${siteUrl.replace(/\/$/, "")}/api/mcp`;
  const localMcpUrl = "http://127.0.0.1:3001/api/mcp";
  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        ssota: {
          url: hostedMcpUrl,
          headers: {
            "X-SSOTA-Project-Id": project.id,
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Setup"
        description="Mount this project only when an agent needs project or task context."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect MCP</CardTitle>
            <CardDescription>
              Use one MCP endpoint and scope every request to this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SetupValue
              label="Hosted MCP URL"
              value={hostedMcpUrl}
              description="Use this URL for deployed clients."
            />
            <SetupValue
              label="Local dev MCP URL"
              value={localMcpUrl}
              description="Use this when `pnpm dev --filter mcp` is running locally."
            />
            <SetupValue
              label="Project id"
              value={project.id}
              description="Pass this in `X-SSOTA-Project-Id` or as the project context required by the tool."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">First run checklist</CardTitle>
            <CardDescription>
              A healthy setup can discover projects and read development workflow tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                "Authorize the MCP client with your SSOTA account.",
                "List projects and confirm this project appears.",
                "Use list_tasks, query_tasks, or get_task for task context.",
                "Keep normal coding work in the repository workflow, not MCP.",
                "Treat archived graph/catalog tools as reference-only.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <Badge variant="secondary" className="h-fit">
                    {index + 1}
                  </Badge>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cursor MCP config</CardTitle>
          <CardDescription>
            Paste this into your MCP config, then complete OAuth when the client
            prompts for authorization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {cursorConfig}
          </pre>
          <CopyButton value={cursorConfig} label="Copy config" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active MCP scope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ["Projects", "Discover organizations and project scope."],
            ["Tasks", "Read task queues for development workflow context."],
            ["Auth", "OAuth/JWT still scopes every request."],
            ["Archive", "Generic graph runtime tools are hidden from active UX."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border p-3">
              <div className="font-medium">{title}</div>
              <p className="mt-1 text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href={projectPath(ctx, "tasks")} />} nativeButton={false}>
          Open Tasks
        </Button>
      </div>
    </div>
  );
}

function SetupValue({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
        <code className="break-all text-xs">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}
