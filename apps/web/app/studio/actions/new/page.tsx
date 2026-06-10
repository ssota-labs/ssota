import { redirect } from "next/navigation";
import Link from "next/link";
import { defineActionContractAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@loopos/ui/components/ui/native-select";
import { Textarea } from "@loopos/ui/components/ui/textarea";

export default async function NewActionContractPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  async function createAction(formData: FormData) {
    "use server";
    const effectsJson = String(formData.get("effectsJson") ?? "[]");
    const effects = JSON.parse(effectsJson) as Record<string, unknown>[];
    await defineActionContractAction({
      definition: {
        actionType: String(formData.get("actionType") ?? ""),
        preconditions: {},
        effects,
        executor: String(formData.get("executor") ?? "Agent"),
        allowedLifecycleTransitions: {},
        failureMode: "reject",
        logPayloadSchema: {},
      },
    });
    redirect("/studio/actions");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Define Action Contract"
        description="define_action_contract — unsafe catalog effects are rejected at enforcement"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="actionType">Action Type</Label>
                <Input id="actionType" name="actionType" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="executor">Executor</Label>
                <NativeSelect id="executor" name="executor" defaultValue="Agent" className="w-full">
                  <NativeSelectOption value="Agent">Agent</NativeSelectOption>
                  <NativeSelectOption value="Human">Human</NativeSelectOption>
                  <NativeSelectOption value="System">System</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectsJson">Effects (JSON array)</Label>
              <Textarea
                id="effectsJson"
                name="effectsJson"
                className="font-mono text-xs"
                rows={8}
                defaultValue={`[
  {
    "kind": "create_node",
    "node": {
      "nodeType": "Note",
      "lifecycleStatus": "Draft",
      "properties": {},
      "provenance": {}
    }
  }
]`}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">define_action_contract 실행</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Button render={<Link href="/studio/actions" />} variant="ghost" nativeButton={false}>
        ← Actions
      </Button>
    </div>
  );
}
