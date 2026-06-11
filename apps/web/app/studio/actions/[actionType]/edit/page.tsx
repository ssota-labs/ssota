import { redirect } from "next/navigation";
import Link from "next/link";
import {
  deprecateActionContractAction,
  updateActionContractAction,
} from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Label } from "@ssota/ui/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@ssota/ui/components/ui/native-select";
import { Textarea } from "@ssota/ui/components/ui/textarea";

export default async function EditActionContractPage({
  params,
}: {
  params: Promise<{ actionType: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { actionType } = await params;
  const decoded = decodeURIComponent(actionType);
  const ports = getActionPorts();
  const entry = await ports.catalog.getActionCatalogEntry(decoded);
  if (!entry) redirect("/studio/actions");

  async function updateAction(formData: FormData) {
    "use server";
    const effectsJson = String(formData.get("effectsJson") ?? "[]");
    const effects = JSON.parse(effectsJson) as Record<string, unknown>[];
    await updateActionContractAction({
      actionType: decoded,
      patch: {
        executor: String(formData.get("executor") ?? entry!.executor),
        effects,
      },
    });
  }

  async function deprecateAction() {
    "use server";
    await deprecateActionContractAction({ actionType: decoded });
    redirect("/studio/actions");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${entry.actionType}`} description="update / deprecate action contract" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Action Contract</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="executor">Executor</Label>
              <NativeSelect
                id="executor"
                name="executor"
                defaultValue={entry.executor}
                className="w-full"
              >
                <NativeSelectOption value="Agent">Agent</NativeSelectOption>
                <NativeSelectOption value="Human">Human</NativeSelectOption>
                <NativeSelectOption value="System">System</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectsJson">Effects (JSON)</Label>
              <Textarea
                id="effectsJson"
                name="effectsJson"
                className="font-mono text-xs"
                rows={10}
                defaultValue={JSON.stringify(entry.effects, null, 2)}
              />
            </div>
            <Button type="submit">update_action_contract 실행</Button>
          </form>
        </CardContent>
      </Card>
      <form action={deprecateAction}>
        <Button type="submit" variant="destructive">
          deprecate_action_contract 실행
        </Button>
      </form>
      <Button render={<Link href="/studio/actions" />} variant="ghost" nativeButton={false}>
        ← Actions
      </Button>
    </div>
  );
}
