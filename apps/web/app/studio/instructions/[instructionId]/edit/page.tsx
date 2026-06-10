import { redirect } from "next/navigation";
import Link from "next/link";
import {
  deprecateInstructionAction,
  updateInstructionAction,
} from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";
import { Textarea } from "@loopos/ui/components/ui/textarea";

export default async function EditInstructionPage({
  params,
}: {
  params: Promise<{ instructionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { instructionId } = await params;
  const ports = getActionPorts();
  const entry = await ports.catalog.getInstruction(instructionId);
  if (!entry) redirect("/studio/instructions");

  async function updateAction(formData: FormData) {
    "use server";
    await updateInstructionAction({
      instructionId,
      patch: {
        title: String(formData.get("title") ?? entry!.title),
        body: String(formData.get("body") ?? entry!.body),
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
      <PageHeader title={`Edit: ${entry.title}`} description="update / deprecate instruction" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Instruction</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={entry.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" defaultValue={entry.body} rows={6} />
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
        ← Instructions
      </Button>
    </div>
  );
}
