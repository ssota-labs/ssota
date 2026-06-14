import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { defineWorkflowAction } from "@/app/actions";
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

export default async function NewWorkflowPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  async function createAction(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    await defineWorkflowAction({
      definition: {
        title,
        trigger: {
          patterns: String(formData.get("triggerPatterns") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          events: [],
        },
        applicableNodeTypes: String(formData.get("applicableNodeTypes") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requiredActions: String(formData.get("requiredActions") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        optionalActions: [],
        lifecycle: "Active",
        scope: { kind: "global" },
        steps: [{ id: "execute", title, mode: "agentic", actions: [] }],
        ...(String(formData.get("body") ?? "").trim()
          ? { agentNotes: String(formData.get("body") ?? "").trim() }
          : {}),
        ...(String(formData.get("workflowKey") ?? "").trim()
          ? { workflowKey: String(formData.get("workflowKey") ?? "").trim() }
          : {}),
        ...(String(formData.get("contentUrl") ?? "").trim()
          ? {
              references: [
                {
                  id: "runbook",
                  title: "Runbook",
                  kind: "url" as const,
                  url: String(formData.get("contentUrl") ?? "").trim(),
                },
              ],
            }
          : {}),
      },
    });
    redirect("/studio/workflows");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Define Workflow" description="define_workflow 메타 액션" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerPatterns">Trigger Patterns (comma-separated)</Label>
              <Input id="triggerPatterns" name="triggerPatterns" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicableNodeTypes">Applicable Node Types</Label>
              <Input id="applicableNodeTypes" name="applicableNodeTypes" placeholder="Document" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredActions">Required Actions</Label>
              <Input id="requiredActions" name="requiredActions" placeholder="create_document" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflowKey">Workflow key</Label>
              <Input id="workflowKey" name="workflowKey" placeholder="discovery_steward" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentUrl">External runbook URL</Label>
              <Input id="contentUrl" name="contentUrl" type="url" placeholder="https://notion.so/…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Inline body</Label>
              <Textarea id="body" name="body" />
            </div>
            <Button type="submit">define_workflow 실행</Button>
          </form>
        </CardContent>
      </Card>
      <Button render={<Link href="/studio/workflows" />} variant="ghost" nativeButton={false}>
        ← Workflows
      </Button>
    </div>
  );
}
