import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { DefineNodeTypeForm } from "@/components/studio/define-node-type-form";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@ssota/ui/components/ui/button";

export default async function NewNodeTypePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const archetypes = await ports.catalog.listArchetypes();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Define Node Type"
        description="define_node_type 메타 액션으로 새 Node Type을 등록합니다."
      />

      <DefineNodeTypeForm archetypes={archetypes} />

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
