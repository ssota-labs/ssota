import { redirect } from "next/navigation";
import Link from "next/link";
import {
  deprecateWorkflowAction,
  updateWorkflowAction,
} from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { workflowId } = await params;
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getWorkflow(workflowId);
  if (!entry) redirect("/studio/workflows");

  const runbookUrl =
    entry.spec.references.find((ref) => ref.kind === "url")?.url ?? "";

  async function updateAction(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? entry!.spec.title);
    const body = String(formData.get("body") ?? "").trim();
    const contentUrl = String(formData.get("contentUrl") ?? "").trim();
    const workflowKey = String(formData.get("workflowKey") ?? "").trim();
    await updateWorkflowAction({
      workflowId,
      patch: {
        title,
        ...(workflowKey ? { workflowKey } : {}),
        ...(body ? { agentNotes: body } : {}),
        references: [
          ...(body
            ? [{ id: "agent_body", title: "Body", kind: "inline" as const, body }]
            : []),
          ...(contentUrl
            ? [{ id: "runbook", title: "Runbook", kind: "url" as const, url: contentUrl }]
            : []),
        ],
      },
    });
  }

  async function deprecateAction() {
    "use server";
    await deprecateWorkflowAction({ workflowId });
    redirect("/studio/workflows");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${entry.spec.title}`} description="update / deprecate workflow" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={entry.spec.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflowKey">Workflow key</Label>
              <Input
                id="workflowKey"
                name="workflowKey"
                defaultValue={entry.workflowKey ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentUrl">External runbook URL</Label>
              <Input
                id="contentUrl"
                name="contentUrl"
                type="url"
                defaultValue={runbookUrl}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Inline body</Label>
              <Textarea
                id="body"
                name="body"
                defaultValue={entry.spec.agentNotes ?? ""}
                rows={6}
              />
            </div>
            <Button type="submit">update_workflow 실행</Button>
          </form>
        </CardContent>
      </Card>
      <form action={deprecateAction}>
        <Button type="submit" variant="destructive">
          deprecate_workflow 실행
        </Button>
      </form>
      <Button render={<Link href="/studio/workflows" />} variant="ghost" nativeButton={false}>
        ← Workflows
      </Button>
    </div>
  );
}
