import { redirect } from "next/navigation";
import Link from "next/link";
import {
  deprecateInstructionAction,
  updateInstructionAction,
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

export default async function EditInstructionPage({
  params,
}: {
  params: Promise<{ instructionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { instructionId } = await params;
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getInstruction(instructionId);
  if (!entry) redirect("/studio/instructions");

  async function updateAction(formData: FormData) {
    "use server";
    await updateInstructionAction({
      instructionId,
      patch: {
        title: String(formData.get("title") ?? entry!.title),
        body:
          formData.has("body")
            ? String(formData.get("body") ?? "").trim() || null
            : entry!.body,
        contentUrl:
          formData.has("contentUrl")
            ? String(formData.get("contentUrl") ?? "").trim() || null
            : entry!.contentUrl,
        instructionKey:
          formData.has("instructionKey")
            ? String(formData.get("instructionKey") ?? "").trim() || null
            : entry!.instructionKey,
      },
    });
  }

  async function deprecateAction() {
    "use server";
    await deprecateInstructionAction({ instructionId });
    redirect("/studio/instructions");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${entry.title}`} description="update / deprecate workflow" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={entry.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructionKey">Instruction key</Label>
              <Input
                id="instructionKey"
                name="instructionKey"
                defaultValue={entry.instructionKey ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentUrl">External runbook URL</Label>
              <Input
                id="contentUrl"
                name="contentUrl"
                type="url"
                defaultValue={entry.contentUrl ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Inline body</Label>
              <Textarea
                id="body"
                name="body"
                defaultValue={entry.body ?? ""}
                rows={6}
              />
            </div>
            <Button type="submit">update_instruction 실행</Button>
          </form>
        </CardContent>
      </Card>
      <form action={deprecateAction}>
        <Button type="submit" variant="destructive">
          deprecate_instruction 실행
        </Button>
      </form>
      <Button render={<Link href="/studio/instructions" />} variant="ghost" nativeButton={false}>
        ← Workflows
      </Button>
    </div>
  );
}
