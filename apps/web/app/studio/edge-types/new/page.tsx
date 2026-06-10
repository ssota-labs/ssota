import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { defineEdgeTypeAction } from "@/app/actions";
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

export default async function NewEdgeTypePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  async function createAction(formData: FormData) {
    "use server";
    await defineEdgeTypeAction({
      definition: {
        edgeType: String(formData.get("edgeType") ?? ""),
        domain: String(formData.get("domain") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        range: String(formData.get("range") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        cardinality: String(formData.get("cardinality") ?? "many-to-many"),
        representation: String(formData.get("representation") ?? "directed"),
      },
    });
    redirect("/studio/edge-types");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Define Edge Type" description="define_edge_type 메타 액션" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edge Type Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edgeType">Edge Type</Label>
              <Input id="edgeType" name="edgeType" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain (comma-separated node types)</Label>
              <Input id="domain" name="domain" placeholder="Document, Note" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="range">Range (comma-separated node types)</Label>
              <Input id="range" name="range" placeholder="Document, Note" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardinality">Cardinality</Label>
                <Input id="cardinality" name="cardinality" defaultValue="many-to-many" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representation">Representation</Label>
                <Input id="representation" name="representation" defaultValue="directed" />
              </div>
            </div>
            <Button type="submit">define_edge_type 실행</Button>
          </form>
        </CardContent>
      </Card>
      <Button render={<Link href="/studio/edge-types" />} variant="ghost" nativeButton={false}>
        ← Edge Types
      </Button>
    </div>
  );
}
