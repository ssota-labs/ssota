"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlusIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import type { SandboxEnvironmentIndex } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { CardListSheet } from "@/components/card-list-sheet";
import { SandboxEnvironmentSheet } from "@/components/settings/sandbox-environment-sheet";

type SandboxWorkspaceProps = {
  title: string;
  description: string;
  orgSlug: string;
  teamspaceSlug: string;
  environments: SandboxEnvironmentIndex[];
};

export function SandboxWorkspace({
  title,
  description,
  orgSlug,
  teamspaceSlug,
  environments,
}: SandboxWorkspaceProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = () => router.refresh();

  useEffect(() => {
    if (!createOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen]);

  return (
    <CardListSheet.Root
      activeId={selectedId}
      onActiveIdChange={setSelectedId}
      className="absolute inset-0 flex flex-col"
      testId="sandbox-workspace"
    >
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title={title}
          description={description}
          actions={
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="sandbox-environment-create"
            >
              <PlusIcon className="size-4" />
              New environment
            </Button>
          }
        />

        <BrowseWorkspace.Section label="Environments">
          <div data-testid="sandbox-environments-panel">
            {environments.length === 0 ? (
              <BrowseWorkspace.Empty>
                No sandbox environments yet. Create one or let the first agent run provision{" "}
                <code className="text-xs">sandbox.dev_node24</code> automatically.
              </BrowseWorkspace.Empty>
            ) : (
              <CardListSheet.List className="border-border">
                {environments.map((env) => (
                  <CardListSheet.Row
                    key={env.id}
                    id={env.id}
                    testId={`sandbox-environment-row-${env.key}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                      <TerminalWindowIcon className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{env.name}</span>
                        <Badge variant="secondary" className="font-normal">
                          {env.runtime}
                        </Badge>
                      </div>
                      {env.description ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {env.description}
                        </p>
                      ) : (
                        <p className="font-mono text-xs text-muted-foreground">{env.key}</p>
                      )}
                    </div>
                    <CardListSheet.RowCaret />
                  </CardListSheet.Row>
                ))}
              </CardListSheet.List>
            )}
          </div>
        </BrowseWorkspace.Section>

        <SandboxEnvironmentSheet
          orgSlug={orgSlug}
          teamspaceSlug={teamspaceSlug}
          environmentId={selectedId}
          mode="view"
          open={selectedId !== null}
          onOpenChange={(open) => !open && setSelectedId(null)}
          onSaved={refresh}
        />

        <SandboxEnvironmentSheet
          orgSlug={orgSlug}
          teamspaceSlug={teamspaceSlug}
          environmentId={null}
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={refresh}
        />
      </BrowseWorkspace.Frame>
    </CardListSheet.Root>
  );
}
