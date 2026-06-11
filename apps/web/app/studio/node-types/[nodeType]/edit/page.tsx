import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { deprecateNodeTypeAction, updateNodeTypeAction } from "@/app/actions";
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

export default async function EditNodeTypePage({
  params,
}: {
  params: Promise<{ nodeType: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { nodeType } = await params;
  const decoded = decodeURIComponent(nodeType);
  const projectId = await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntry(decoded);

  if (!entry) {
    redirect("/studio/node-types");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const contentGuide = String(formData.get("contentGuide") ?? "");
    await updateNodeTypeAction({
      nodeType: decoded,
      patch: { contentGuide: contentGuide || null },
    });
  }

  async function deprecateAction(formData: FormData) {
    "use server";
    const replacement = String(formData.get("replacementNodeType") ?? "");
    await deprecateNodeTypeAction({
      nodeType: decoded,
      replacementNodeType: replacement || undefined,
    });
    redirect("/studio/node-types");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${entry.nodeType}`}
        description="update_node_type / deprecate_node_type 메타 액션"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Node Type</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentGuide">Content Guide</Label>
              <Textarea
                id="contentGuide"
                name="contentGuide"
                defaultValue={entry.contentGuide ?? ""}
              />
            </div>
            <Button type="submit">update_node_type 실행</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Deprecate Node Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={deprecateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="replacementNodeType">Replacement (optional)</Label>
              <Input
                id="replacementNodeType"
                name="replacementNodeType"
                placeholder="Note"
              />
            </div>
            <Button type="submit" variant="destructive">
              deprecate_node_type 실행
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        render={<Link href="/studio/node-types" />}
        variant="ghost"
        nativeButton={false}
      >
        ← Node Types 목록
      </Button>
    </div>
  );
}
