import { OutcomeBadge } from "@/components/outcome-badge";
import { PageHeader } from "@/components/studio/page-header";
import { getTranslations } from "@/lib/i18n/server";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";

export default async function LogPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { t } = await getTranslations();
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const log = await ports.commit.getActionLog({ limit: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("log.title")}
        description={t("log.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("log.recentActivity")}</CardTitle>
          <CardDescription>{t("log.recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("log.time")}</TableHead>
                <TableHead>{t("log.action")}</TableHead>
                <TableHead>{t("log.scope")}</TableHead>
                <TableHead>{t("log.instruction")}</TableHead>
                <TableHead>{t("log.outcome")}</TableHead>
                <TableHead>{t("log.executor")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {entry.createdAt.toISOString()}
                  </TableCell>
                  <TableCell className="font-medium">{entry.actionType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatScope(entry.metadata.scope ?? entry.input.scope)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {String(
                      entry.metadata.instructionRunId ??
                        entry.metadata.instructionId ??
                        "-",
                    )}
                  </TableCell>
                  <TableCell>
                    <OutcomeBadge outcome={entry.outcome} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.executorType}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatScope(scope: unknown) {
  if (!scope || typeof scope !== "object") return "-";
  const value = scope as Record<string, unknown>;
  if (value.kind === "node_type") return `node:${String(value.nodeType)}`;
  if (value.kind === "edge_type") return `edge:${String(value.edgeType)}`;
  if (value.kind === "property") {
    return `property:${String(value.nodeType)}.${String(value.propertyKey)}`;
  }
  if (value.kind === "instruction") {
    return `instruction:${String(value.title ?? value.instructionId ?? "*")}`;
  }
  if (value.kind === "global") return "global";
  return "-";
}
