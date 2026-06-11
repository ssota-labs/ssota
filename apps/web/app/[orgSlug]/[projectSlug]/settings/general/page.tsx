import { PageHeader } from "@/components/studio/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";

export default async function SettingsGeneralPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Project and organization configuration."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>
            Org slug: {orgSlug} · Project slug: {projectSlug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            MCP 연동·멤버 관리 설정은 후속 마일스톤에서 추가됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
