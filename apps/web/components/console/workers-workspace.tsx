"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ClockIcon,
  FloppyDiskIcon,
  GlobeIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { Worker, WorkerIndex, WorkerKind } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { TooltipProvider } from "@ssota/ui/components/ui/tooltip";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { CardListSheet, CardListSheetInlineTitle, CardListSheetPanel } from "@/components/card-list-sheet";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { WorkerScriptEditor, WorkerScriptEditorSkeleton } from "@/components/console/worker-script-editor";
import {
  createWorkerAction,
  deleteWorkerAction,
  dryRunWorkerAction,
  getWorkerAction,
  updateWorkerAction,
} from "@/app/[orgSlug]/[teamspaceSlug]/workers/actions";

const CREATE_WORKER_SHEET_ID = "__create-worker__";

const WORKER_KIND_SECTIONS: Array<{
  kind: WorkerKind;
  label: string;
  description: string;
}> = [
  {
    kind: "tool",
    label: "Tools",
    description: "Run on demand from agents.",
  },
  {
    kind: "sync",
    label: "Sync",
    description: "Scheduled jobs on a cron expression.",
  },
  {
    kind: "webhook",
    label: "Webhooks",
    description: "HTTP POST handlers for external events.",
  },
];

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);
  const [workerDetail, setWorkerDetail] = useState<Worker | null>(null);
  const [editScript, setEditScript] = useState("");
  const [editName, setEditName] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [createKind, setCreateKind] = useState<WorkerKind>("tool");
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createScript, setCreateScript] = useState(DEFAULT_SCRIPT);
  const [createCron, setCreateCron] = useState("0 * * * *");

  const activeWorker = workers.find((w) => w.id === activeId) ?? null;
  const isCreating = isCreateWorkerSheetId(activeId);
  const scriptDirty =
    workerDetail !== null && editScript.trim() !== workerDetail.script;

  useEffect(() => {
    if (!activeId || isCreating || isCreateWorkerSheetId(activeId)) {
      setWorkerDetail(null);
      setEditScript("");
      setEditName("");
      setDryRunResult(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDetail(true);
    void getWorkerAction(teamspaceId, activeId)
      .then((worker) => {
        if (cancelled || !worker) return;
        setWorkerDetail(worker);
        setEditScript(worker.script);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId, isCreating, teamspaceId]);

  useEffect(() => {
    if (activeWorker) {
      setEditName(activeWorker.name);
    }
  }, [activeWorker?.id, activeWorker?.name]);

  const workersByKind = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesSearch = (w: WorkerIndex) => {
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.key.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
      );
    };

    const grouped: Record<WorkerKind, WorkerIndex[]> = {
      tool: [],
      sync: [],
      webhook: [],
    };

    for (const worker of workers) {
      if (matchesSearch(worker)) {
        grouped[worker.kind].push(worker);
      }
    }

    for (const kind of Object.keys(grouped) as WorkerKind[]) {
      grouped[kind].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
  }, [workers, query]);

  const hasVisibleWorkers = WORKER_KIND_SECTIONS.some(
    (section) => workersByKind[section.kind].length > 0,
  );

  function openCreateSheet(kind: WorkerKind) {
    resetCreateForm();
    setCreateKind(kind);
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

  function handleSaveScript() {
    if (!activeWorker || !editScript.trim()) return;
    startTransition(async () => {
      const worker = await updateWorkerAction(
        orgSlug,
        teamspaceSlug,
        teamspaceId,
        activeWorker.id,
        { script: editScript },
      );
      setWorkerDetail(worker);
      setEditScript(worker.script);
      setWorkers((prev) =>
        prev.map((entry) =>
          entry.id === worker.id ? { ...entry, version: worker.version } : entry,
        ),
      );
      setDryRunResult(null);
    });
  }

  function handleSaveName() {
    if (!activeWorker) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === activeWorker.name) {
      setEditName(activeWorker.name);
      return;
    }
    startTransition(async () => {
      const worker = await updateWorkerAction(
        orgSlug,
        teamspaceSlug,
        teamspaceId,
        activeWorker.id,
        { name: trimmed },
      );
      setEditName(worker.name);
      setWorkerDetail((prev) =>
        prev && prev.id === worker.id ? { ...prev, name: worker.name } : prev,
      );
      setWorkers((prev) =>
        prev.map((entry) =>
          entry.id === worker.id ? { ...entry, name: worker.name } : entry,
        ),
      );
    });
  }

  function handleActiveIdChange(nextId: string | null) {
    if (isCreateWorkerSheetId(activeId) && !isCreateWorkerSheetId(nextId)) {
      resetCreateForm();
    }
    setActiveId(nextId);
  }

  const createSection =
    WORKER_KIND_SECTIONS.find((section) => section.kind === createKind) ??
    WORKER_KIND_SECTIONS[0]!;

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
        >
          <div className="pt-2">
            <Input
              placeholder="Search workers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
              data-testid="workers-search"
            />
          </div>
        </BrowseWorkspace.Header>

        {query.trim() && !hasVisibleWorkers ? (
          <BrowseWorkspace.Empty>No workers match your search.</BrowseWorkspace.Empty>
        ) : null}

        {WORKER_KIND_SECTIONS.map((section) => {
          const sectionWorkers = workersByKind[section.kind];
          if (sectionWorkers.length === 0 && query.trim()) {
            return null;
          }

          return (
            <section key={section.kind} className="space-y-3" data-testid={`workers-section-${section.kind}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openCreateSheet(section.kind)}
                  data-testid={`workers-create-${section.kind}`}
                >
                  <PlusIcon className="size-4" aria-hidden />
                  {section.kind}
                </Button>
              </div>

              {sectionWorkers.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No {section.label.toLowerCase()} yet.
                </p>
              ) : (
                <BrowseWorkspace.Grid>
                  {sectionWorkers.map((worker) => (
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
                    />
                  ))}
                </BrowseWorkspace.Grid>
              )}
            </section>
          );
        })}
      </BrowseWorkspace.Frame>

      {activeWorker && !isCreating ? (
        <CardListSheetPanel
          title={activeWorker.name}
          titleNode={
            <CardListSheetInlineTitle
              key={activeWorker.id}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setEditName(activeWorker.name);
                }
              }}
              data-testid="worker-edit-name"
            />
          }
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

            <Artifact data-testid="worker-script-artifact">
              <ArtifactHeader>
                <ArtifactTitle>TypeScript script</ArtifactTitle>
                {isLoadingDetail ? (
                  activeWorker.kind === "tool" ? (
                    <ArtifactActions>
                      <Skeleton className="size-8 shrink-0 rounded-sm" />
                    </ArtifactActions>
                  ) : null
                ) : (
                  <TooltipProvider delay={0}>
                    <ArtifactActions>
                      {scriptDirty ? (
                        <ArtifactAction
                          tooltip="Save script"
                          icon={<FloppyDiskIcon className="size-4" />}
                          disabled={isPending || !editScript.trim()}
                          onClick={handleSaveScript}
                          data-testid="worker-save-script"
                        />
                      ) : null}
                      {activeWorker.kind === "tool" ? (
                        <ArtifactAction
                          tooltip="Dry run"
                          icon={<PlayIcon className="size-4" />}
                          disabled={isPending}
                          onClick={() => handleDryRun(activeWorker.id)}
                          data-testid="worker-dry-run"
                        />
                      ) : null}
                    </ArtifactActions>
                  </TooltipProvider>
                )}
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                {isLoadingDetail ? (
                  <WorkerScriptEditorSkeleton className="rounded-none border-0 shadow-none" />
                ) : (
                  <WorkerScriptEditor
                    id={`worker-script-${activeWorker.id}`}
                    testId="worker-edit-script"
                    value={editScript}
                    onChange={setEditScript}
                    className="rounded-none border-0 bg-transparent shadow-none"
                  />
                )}
              </ArtifactContent>
            </Artifact>

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
          title={createSection.kind}
          subtitle={createSection.label}
          onClose={closeCreateSheet}
          testId="workers-create-sheet"
          headerPrefix={
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
              {kindIcon(createKind)}
            </span>
          }
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
            <p className="text-sm text-muted-foreground">{createSection.description}</p>
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
              <Label htmlFor="worker-script-create">TypeScript script</Label>
              <WorkerScriptEditor
                id="worker-script-create"
                testId="worker-create-script"
                value={createScript}
                onChange={setCreateScript}
                minHeight="16rem"
              />
            </div>
          </div>
        </CardListSheetPanel>
      ) : null}
    </CardListSheet.Root>
  );
}
