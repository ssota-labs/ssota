"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  SandboxEnvironment,
  SandboxRuntime,
  SandboxSource,
  UpsertSandboxEnvironmentInput,
} from "@ssota/contracts";
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
import { Switch } from "@ssota/ui/components/ui/switch";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  deleteSandboxEnvironmentAction,
  getSandboxEnvironmentAction,
  upsertSandboxEnvironmentAction,
} from "@/app/settings/sandbox-environment-actions";
import { CardListSheetPanel } from "@/components/card-list-sheet";
import { SandboxEnvironmentSheetSkeleton } from "@/components/settings/sandbox-environment-sheet-skeleton";
import { SettingsRow } from "@/components/settings/settings-panel";

type SourceDraft = {
  key: string;
  url: string;
  branch: string;
  path: string;
  primary: boolean;
};

type FormState = {
  key: string;
  name: string;
  description: string;
  runtime: SandboxRuntime;
  workingRoot: string;
  setupScript: string;
  ports: string;
  allowedEnvKeys: string;
  networkEgress: boolean;
  namedSandbox: boolean;
  snapshotOnSetup: boolean;
  idleTimeoutMinutes: string;
  sources: SourceDraft[];
};

const RUNTIMES: SandboxRuntime[] = ["node24", "node26", "python3.13"];

function emptySource(index: number): SourceDraft {
  return {
    key: `repo-${index + 1}`,
    url: "",
    branch: "main",
    path: "/vercel/sandbox",
    primary: index === 0,
  };
}

function toFormState(
  environment: SandboxEnvironment,
  sources: SandboxSource[],
): FormState {
  return {
    key: environment.key,
    name: environment.name,
    description: environment.description,
    runtime: environment.runtime,
    workingRoot: environment.workingRoot,
    setupScript: environment.setupScript ?? "",
    ports: environment.ports.join(", "),
    allowedEnvKeys: environment.envPolicy.allowedKeys.join(", "),
    networkEgress: environment.envPolicy.networkEgress,
    namedSandbox: environment.persistencePolicy.namedSandbox,
    snapshotOnSetup: environment.persistencePolicy.snapshotOnSetup,
    idleTimeoutMinutes: environment.persistencePolicy.idleTimeoutMs
      ? String(Math.round(environment.persistencePolicy.idleTimeoutMs / 60_000))
      : "",
    sources:
      sources.length > 0
        ? sources.map((s) => ({
            key: s.key,
            url: s.url,
            branch: s.branch,
            path: s.path,
            primary: s.primary,
          }))
        : [emptySource(0)],
  };
}

function createEmptyForm(): FormState {
  return {
    key: "",
    name: "",
    description: "",
    runtime: "node24",
    workingRoot: "/vercel/sandbox",
    setupScript: "",
    ports: "",
    allowedEnvKeys: "",
    networkEgress: true,
    namedSandbox: true,
    snapshotOnSetup: true,
    idleTimeoutMinutes: "",
    sources: [emptySource(0)],
  };
}

function parsePorts(raw: string): number[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function toUpsertInput(
  form: FormState,
  environmentId?: string,
): UpsertSandboxEnvironmentInput {
  const sources = form.sources
    .filter((s) => s.url.trim())
    .map((s) => ({
      key: s.key.trim() || "repo",
      url: s.url.trim(),
      provider: "github" as const,
      branch: s.branch.trim() || "main",
      path: s.path.trim() || "/vercel/sandbox",
      primary: s.primary,
    }));
  const primary = sources.find((s) => s.primary) ?? sources[0];

  return {
    id: environmentId,
    key: form.key.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    runtime: form.runtime,
    workingRoot: form.workingRoot.trim() || "/vercel/sandbox",
    primarySourceKey: primary?.key ?? null,
    setupScript: form.setupScript.trim() || null,
    ports: parsePorts(form.ports),
    envPolicy: {
      allowedKeys: form.allowedEnvKeys
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      networkEgress: form.networkEgress,
    },
    persistencePolicy: {
      namedSandbox: form.namedSandbox,
      snapshotOnSetup: form.snapshotOnSetup,
      idleTimeoutMs: form.idleTimeoutMinutes
        ? Number(form.idleTimeoutMinutes) * 60_000
        : undefined,
    },
    sources,
  };
}

type SandboxEnvironmentSheetProps = {
  orgSlug: string;
  teamspaceSlug: string;
  environmentId: string | null;
  mode: "view" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function SandboxEnvironmentSheet({
  orgSlug,
  teamspaceSlug,
  environmentId,
  mode,
  open,
  onOpenChange,
  onSaved,
}: SandboxEnvironmentSheetProps) {
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setForm(createEmptyForm());
      setLoading(false);
      return;
    }
    if (!environmentId) return;

    let cancelled = false;
    setLoading(true);
    void getSandboxEnvironmentAction(orgSlug, teamspaceSlug, environmentId).then(
      (data) => {
        if (cancelled) return;
        if (data) {
          setForm(toFormState(data.environment, data.sources));
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, mode, environmentId, orgSlug, teamspaceSlug]);

  const patch = (partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const patchSource = (index: number, partial: Partial<SourceDraft>) => {
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.map((s, i) =>
        i === index ? { ...s, ...partial } : s,
      ),
    }));
  };

  const setPrimarySource = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.map((s, i) => ({ ...s, primary: i === index })),
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      await upsertSandboxEnvironmentAction(
        orgSlug,
        teamspaceSlug,
        toUpsertInput(form, environmentId ?? undefined),
      );
      onSaved();
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!environmentId) return;
    startTransition(async () => {
      await deleteSandboxEnvironmentAction(orgSlug, teamspaceSlug, environmentId);
      onSaved();
      onOpenChange(false);
    });
  };

  if (!open) return null;

  const title =
    mode === "create" ? "New sandbox environment" : form.name || "Sandbox environment";

  return (
    <CardListSheetPanel
      title={title}
      subtitle="VM template for coding agent runs — runtime, repos, and boot policy."
      sheetSize="viewport"
      testId="sandbox-environment-sheet"
      onClose={() => onOpenChange(false)}
      footer={
        <div className="flex flex-row justify-between gap-2">
          {mode === "view" && environmentId ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending || loading}
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || loading || !form.key.trim() || !form.name.trim()}
              onClick={handleSave}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <SandboxEnvironmentSheetSkeleton />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">General</h3>
            <div className="divide-y rounded-lg border bg-card">
              <SettingsRow title="Name" description="Display name in console and task picker.">
                <Input
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Dev Node 24"
                />
              </SettingsRow>
              <SettingsRow
                title="Key"
                description="Stable catalog key (teamspace-unique). Used in MCP and task bindings."
              >
                <Input
                  value={form.key}
                  onChange={(e) => patch({ key: e.target.value })}
                  placeholder="sandbox.dev_node24"
                  disabled={Boolean(environmentId)}
                />
              </SettingsRow>
              <SettingsRow title="Description" description="Optional summary for builders.">
                <Textarea
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </SettingsRow>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Runtime</h3>
            <div className="divide-y rounded-lg border bg-card">
              <SettingsRow title="Runtime image" description="Base VM image for agent shell tools.">
                <Select
                  value={form.runtime}
                  onValueChange={(value) => patch({ runtime: value as SandboxRuntime })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUNTIMES.map((runtime) => (
                      <SelectItem key={runtime} value={runtime}>
                        {runtime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
              <SettingsRow
                title="Working root"
                description="Default cwd and path-policy root inside the VM."
              >
                <Input
                  value={form.workingRoot}
                  onChange={(e) => patch({ workingRoot: e.target.value })}
                />
              </SettingsRow>
              <SettingsRow
                title="Exposed ports"
                description="Comma-separated ports to forward (e.g. 3000, 5173)."
              >
                <Input
                  value={form.ports}
                  onChange={(e) => patch({ ports: e.target.value })}
                  placeholder="3000"
                />
              </SettingsRow>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Repositories</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patch({ sources: [...form.sources, emptySource(form.sources.length)] })
                }
              >
                Add repo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cloned on provision via credential broker. Mark one as primary for the default
              checkout path.
            </p>
            <div className="space-y-3">
              {form.sources.map((source, index) => (
                <div
                  key={`${source.key}-${index}`}
                  className="space-y-3 rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Repo {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`primary-${index}`}
                        checked={source.primary}
                        onCheckedChange={() => setPrimarySource(index)}
                      />
                      <Label htmlFor={`primary-${index}`} className="text-xs font-normal">
                        Primary
                      </Label>
                    </div>
                  </div>
                  <Input
                    value={source.url}
                    onChange={(e) => patchSource(index, { url: e.target.value })}
                    placeholder="https://github.com/org/repo"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={source.branch}
                      onChange={(e) => patchSource(index, { branch: e.target.value })}
                      placeholder="main"
                    />
                    <Input
                      value={source.path}
                      onChange={(e) => patchSource(index, { path: e.target.value })}
                      placeholder="/vercel/sandbox"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Bootstrap</h3>
            <div className="divide-y rounded-lg border bg-card">
              <SettingsRow
                title="Setup script"
                description="Shell script run after clone (install deps, build, etc.)."
              >
                <Textarea
                  value={form.setupScript}
                  onChange={(e) => patch({ setupScript: e.target.value })}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder="pnpm install && pnpm build"
                />
              </SettingsRow>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Policy</h3>
            <div className="divide-y rounded-lg border bg-card">
              <SettingsRow
                title="Network egress"
                description="Allow outbound network from the VM."
              >
                <Switch
                  checked={form.networkEgress}
                  onCheckedChange={(checked) => patch({ networkEgress: checked })}
                />
              </SettingsRow>
              <SettingsRow
                title="Named sandbox"
                description="Resume the same Vercel sandbox when possible."
              >
                <Switch
                  checked={form.namedSandbox}
                  onCheckedChange={(checked) => patch({ namedSandbox: checked })}
                />
              </SettingsRow>
              <SettingsRow
                title="Snapshot on setup"
                description="Capture a snapshot after successful bootstrap."
              >
                <Switch
                  checked={form.snapshotOnSetup}
                  onCheckedChange={(checked) => patch({ snapshotOnSetup: checked })}
                />
              </SettingsRow>
              <SettingsRow
                title="Idle timeout (minutes)"
                description="Stop the VM after inactivity. Leave empty for provider default."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.idleTimeoutMinutes}
                  onChange={(e) => patch({ idleTimeoutMinutes: e.target.value })}
                  placeholder="30"
                />
              </SettingsRow>
              <SettingsRow
                title="Allowed env keys"
                description="Env var names agents may inject into shell commands."
              >
                <Input
                  value={form.allowedEnvKeys}
                  onChange={(e) => patch({ allowedEnvKeys: e.target.value })}
                  placeholder="NODE_ENV, CI"
                />
              </SettingsRow>
            </div>
          </section>
        </div>
      )}
    </CardListSheetPanel>
  );
}
