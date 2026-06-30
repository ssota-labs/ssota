import type { SandboxEnvironmentIndex } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
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

type SandboxEnvironmentsPanelProps = {
  environments: SandboxEnvironmentIndex[];
};

export function SandboxEnvironmentsPanel({
  environments,
}: SandboxEnvironmentsPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sandbox environments</CardTitle>
          <CardDescription>
            Reusable VM templates for coding agents. Tasks can pin a specific
            environment or fall back to the teamspace default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {environments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No sandbox environments yet. The default{" "}
              <code className="text-xs">sandbox.dev_node24</code> is created
              automatically when a coding agent run provisions a sandbox.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Runtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {environments.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell className="font-medium">{env.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{env.key}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{env.runtime}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
