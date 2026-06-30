"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CaretRightIcon, PlusIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import type { SandboxEnvironmentIndex } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import { SandboxEnvironmentSheet } from "@/components/settings/sandbox-environment-sheet";

type SandboxEnvironmentsPanelProps = {
  orgSlug: string;
  teamspaceSlug: string;
  environments: SandboxEnvironmentIndex[];
};

export function SandboxEnvironmentsPanel({
  orgSlug,
  teamspaceSlug,
  environments,
}: SandboxEnvironmentsPanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4" data-testid="sandbox-environments-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Reusable VM templates for coding agents. Tasks can pin an environment or
          fall back to the teamspace default.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-testid="sandbox-environment-create"
        >
          <PlusIcon className="size-4" />
          New environment
        </Button>
      </div>

      {environments.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No sandbox environments yet. Create one or let the first agent run
            provision{" "}
            <code className="text-xs">sandbox.dev_node24</code> automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border">
          {environments.map((env) => (
            <button
              key={env.id}
              type="button"
              data-testid={`sandbox-environment-row-${env.key}`}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                selectedId === env.id && "bg-muted/30",
              )}
              onClick={() => setSelectedId(env.id)}
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
              <CaretRightIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
}
