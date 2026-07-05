"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ClockIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { WorkerIndex, WorkerKind } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { CardListSheet, CardListSheetPanel } from "@/components/card-list-sheet";
import {
  createWorkerAction,
  deleteWorkerAction,
  dryRunWorkerAction,
} from "@/app/[orgSlug]/[teamspaceSlug]/workers/actions";

const CREATE_WORKER_SHEET_ID = "__create-worker__";

function isCreateWorkerSheetId(activeId: string | null): boolean {
  return activeId === CREATE_WORKER_SHEET_ID;
}

const DEFAULT_SCRIPT = `export default async function handler(input, sdk) {
  sdk.log("worker run", input);
  return { ok: true };
}
`;

type WorkersWorkspaceProps = {
  orgSlug: string;
  teamspaceSlug: string;
  teamspaceId: string;
  initialWorkers: WorkerIndex[];
};

function kindLabel(kind: WorkerKind): string {
  if (kind === "tool") return "Tool";
  if (kind === "sync") return "Sync";
  return "Webhook";
}

function kindIcon(kind: WorkerKind) {
  if (kind === "sync") return <ClockIcon className="size-5" />;
  if (kind === "webhook") return <GlobeIcon className="size-5" />;
  return <WrenchIcon className="size-5" />;
}

function webhookUrl(teamspaceId: string, key: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/workers/webhook/${teamspaceId}/${key}`;
  }
  return `/api/workers/webhook/${teamspaceId}/${key}`;
}

export function WorkersWorkspace({
  orgSlug,
  teamspaceSlug,
  teamspaceId,
  initialWorkers,
}: WorkersWorkspaceProps) {
  const [workers, setWorkers] = useState(initialWorkers);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<WorkerKind | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);

  const [createKind, setCreateKind] = useState<WorkerKind>("tool");
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createScript, setCreateScript] = useState(DEFAULT_SCRIPT);
  const [createCron, setCreateCron] = useState("0 * * * *");

  const activeWorker = workers.find((w) => w.id === activeId) ?? null;
  const isCreating = isCreateWorkerSheetId(activeId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workers
      .filter((w) => (kindFilter === "all" ? true : w.kind === kindFilter))
      .filter((w) => {
        if (!q) return true;
        return (
          w.name.toLowerCase().includes(q) ||
          w.key.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q)
        );
      })
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [workers, query, kindFilter]);

  function openCreateSheet() {
    resetCreateForm();
    setActiveId(CREATE_WORKER_SHEET_ID);
  }

  function closeCreateSheet() {
    if (isCreating) {
      setActiveId(null);
      resetCreateForm();
    }
  }

  function resetCreateForm() {
    setCreateKind("tool");
    setCreateKey("");
    setCreateName("");
    setCreateDescription("");
    setCreateScript(DEFAULT_SCRIPT);
    setCreateCron("0 * * * *");
  }

  function handleCreate() {
    if (!createKey.trim() || !createName.trim()) return;
    startTransition(async () => {
      const kindConfig =
        createKind === "sync"
          ? {
              cronExpression: createCron,
              timezone: "UTC",
              enabled: true,
            }
          : createKind === "webhook"
            ? { enabled: true, verification: "none" as const }
            : undefined;

      const worker = await createWorkerAction(orgSlug, teamspaceSlug, teamspaceId, {
        key: createKey.trim(),
        name: createName.trim(),
        description: createDescription.trim(),
        kind: createKind,
        script: createScript,
        inputSchema: {},
        runtime: "vercel_sandbox",
        kindConfig,
      });

      setWorkers((prev) => {
        const next: WorkerIndex = {
          id: worker.id,
          key: worker.key,
          name: worker.name,
          description: worker.description,
          kind: worker.kind,
          version: worker.version,
        };
        return [...prev.filter((w) => w.id !== worker.id), next].toSorted((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
      resetCreateForm();
      setActiveId(worker.id);
    });
  }

  function handleDelete(workerId: string) {
    startTransition(async () => {
      await deleteWorkerAction(orgSlug, teamspaceSlug, teamspaceId, workerId);
      setWorkers((prev) => prev.filter((w) => w.id !== workerId));
      setActiveId(null);
    });
  }

  function handleDryRun(workerId: string) {
    setDryRunResult(null);
    startTransition(async () => {
      const result = await dryRunWorkerAction(teamspaceId, workerId, {});
      setDryRunResult(
        result.ok
          ? JSON.stringify(result.output, null, 2)
          : result.error ?? "Dry run failed",
      );
    });
  }

  function handleActiveIdChange(nextId: string | null) {
    if (isCreateWorkerSheetId(activeId) && !isCreateWorkerSheetId(nextId)) {
      resetCreateForm();
    }
    setActiveId(nextId);
  }

  return (
    <CardListSheet.Root
      activeId={activeId}
      onActiveIdChange={handleActiveIdChange}
      dismissOnOutsideClick
      className="absolute inset-0 flex flex-col"
      testId="workers-workspace"
    >
      <BrowseWorkspace.Frame testId="workers-browse">
        <BrowseWorkspace.Header
          title="Workers"
          description="Stored TypeScript capabilities — tools for agents, scheduled sync jobs, and webhook handlers."
          actions={
            <Button
              type="button"
              onClick={openCreateSheet}
              data-testid="workers-create-button"
            >
              <PlusIcon className="size-4" aria-hidden />
              Create worker
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              placeholder="Search workers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
              data-testid="workers-search"
            />
            <Select
              value={kindFilter}
              onValueChange={(v) => setKindFilter(v as WorkerKind | "all")}
            >
              <SelectTrigger className="w-[140px]" data-testid="workers-kind-filter">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="sync">Sync</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </BrowseWorkspace.Header>

        {filtered.length === 0 ? (
          <BrowseWorkspace.Empty>
            No workers yet. Create a tool, sync, or webhook worker to get started.
          </BrowseWorkspace.Empty>
        ) : (
          <BrowseWorkspace.Grid>
            {filtered.map((worker) => (
              <BrowseWorkspace.Card
                key={worker.id}
                title={worker.name}
                subtitle={worker.key}
                description={worker.description || undefined}
                onSelect={() => setActiveId(worker.id)}
                testId={`worker-card-${worker.key}`}
                icon={
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                    {kindIcon(worker.kind)}
                  </span>
                }
                badge={
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {kindLabel(worker.kind)}
                  </Badge>
                }
              />
            ))}
          </BrowseWorkspace.Grid>
        )}
      </BrowseWorkspace.Frame>

      {activeWorker && !isCreating ? (
        <CardListSheetPanel
          title={activeWorker.name}
          subtitle={activeWorker.key}
          onClose={() => setActiveId(null)}
          headerPrefix={
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
              {kindIcon(activeWorker.kind)}
            </span>
          }
        >
          <div className="space-y-4" data-testid={`worker-detail-${activeWorker.key}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{kindLabel(activeWorker.kind)}</Badge>
              <Badge variant="outline">v{activeWorker.version}</Badge>
            </div>

            {activeWorker.description ? (
              <p className="text-sm text-muted-foreground">{activeWorker.description}</p>
            ) : null}

            {activeWorker.kind === "webhook" ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <Input
                  readOnly
                  value={webhookUrl(teamspaceId, activeWorker.key)}
                  data-testid="worker-webhook-url"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            ) : null}

            {activeWorker.kind === "tool" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDryRun(activeWorker.id)}
                  data-testid="worker-dry-run"
                >
                  Dry run
                </Button>
              </div>
            ) : null}

            {dryRunResult ? (
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {dryRunResult}
              </pre>
            ) : null}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(activeWorker.id)}
              data-testid="worker-delete"
            >
              <TrashIcon className="size-4" aria-hidden />
              Delete worker
            </Button>
          </div>
        </CardListSheetPanel>
      ) : null}

      {isCreating ? (
        <CardListSheetPanel
          title="Create worker"
          subtitle="Tool, sync, or webhook"
          onClose={closeCreateSheet}
          testId="workers-create-sheet"
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeCreateSheet}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending || !createKey.trim() || !createName.trim()}
                onClick={handleCreate}
                data-testid="worker-create-submit"
              >
                Create
              </Button>
            </div>
          }
        >
          <div className="grid gap-4" data-testid="workers-create-form">
            <p className="text-sm text-muted-foreground">
              Tool workers run on demand from agents. Sync workers run on a cron schedule.
              Webhook workers accept HTTP POST payloads.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="worker-kind">Kind</Label>
              <Select
                value={createKind}
                onValueChange={(v) => setCreateKind(v as WorkerKind)}
              >
                <SelectTrigger id="worker-kind" data-testid="worker-create-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="sync">Sync</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="worker-key">Key</Label>
              <Input
                id="worker-key"
                value={createKey}
                onChange={(e) => setCreateKey(e.target.value)}
                placeholder="echo"
                data-testid="worker-create-key"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="worker-name">Name</Label>
              <Input
                id="worker-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Echo worker"
                data-testid="worker-create-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="worker-description">Description</Label>
              <Textarea
                id="worker-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={2}
              />
            </div>
            {createKind === "sync" ? (
              <div className="grid gap-2">
                <Label htmlFor="worker-cron">Cron expression</Label>
                <Input
                  id="worker-cron"
                  value={createCron}
                  onChange={(e) => setCreateCron(e.target.value)}
                  placeholder="0 * * * *"
                  data-testid="worker-create-cron"
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="worker-script">TypeScript script</Label>
              <Textarea
                id="worker-script"
                value={createScript}
                onChange={(e) => setCreateScript(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                data-testid="worker-create-script"
              />
            </div>
          </div>
        </CardListSheetPanel>
      ) : null}
    </CardListSheet.Root>
  );
}
