import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { definePropertyAction } from "@/app/actions";
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

export default async function NewPropertyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  async function createAction(formData: FormData) {
    "use server";
    await definePropertyAction({
      definition: {
        propertyKey: String(formData.get("propertyKey") ?? ""),
        valueType: String(formData.get("valueType") ?? "string"),
        constraints: {},
        owningActions: String(formData.get("owningActions") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
    redirect("/studio/properties");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Define Property" description="define_property 메타 액션" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyKey">Property Key</Label>
              <Input id="propertyKey" name="propertyKey" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueType">Value Type</Label>
              <Input id="valueType" name="valueType" defaultValue="string" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owningActions">Owning Actions (comma-separated)</Label>
              <Input id="owningActions" name="owningActions" placeholder="create_document" />
            </div>
            <Button type="submit">define_property 실행</Button>
          </form>
        </CardContent>
      </Card>
      <Button render={<Link href="/studio/properties" />} variant="ghost" nativeButton={false}>
        ← Properties
      </Button>
    </div>
  );
}
