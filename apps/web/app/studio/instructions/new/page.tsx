import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { defineInstructionAction } from "@/app/actions";
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

export default async function NewInstructionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  async function createAction(formData: FormData) {
    "use server";
    await defineInstructionAction({
      definition: {
        title: String(formData.get("title") ?? ""),
        triggerPatterns: String(formData.get("triggerPatterns") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
        body: String(formData.get("body") ?? ""),
      },
    });
    redirect("/studio/instructions");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Define Instruction" description="define_instruction 메타 액션" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instruction Definition</CardTitle>
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
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" required />
            </div>
            <Button type="submit">define_instruction 실행</Button>
          </form>
        </CardContent>
      </Card>
      <Button render={<Link href="/studio/instructions" />} variant="ghost" nativeButton={false}>
        ← Instructions
      </Button>
    </div>
  );
}
