"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CaretRightIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Skill, SkillIndex } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { cn } from "@ssota/ui/lib/utils";
import { BrowseWorkspace } from "@/components/console/browse-workspace";

type SkillDetail = {
  skill: Skill;
  files: Array<{ path: string; contents: string }>;
};

type SkillsPageWorkspaceProps = {
  teamspaceId: string;
  orgSlug: string;
  teamspaceSlug: string;
};

function sourceLabel(source: SkillIndex["source"]) {
  if (source === "builtin") return "Platform";
  if (source === "custom") return "Custom";
  return source;
}

export function SkillsPageWorkspace({
  teamspaceId,
  orgSlug,
  teamspaceSlug,
}: SkillsPageWorkspaceProps) {
  const [skills, setSkills] = useState<SkillIndex[]>([]);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [isPending, startListTransition] = useTransition();
  const [isDetailPending, startDetailTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const listRequestId = useRef(0);

  const teamspaceQuery = `teamspaceId=${teamspaceId}`;

  const mergeSkillIndex = useCallback((skill: Skill) => {
    const next: SkillIndex = {
      id: skill.id,
      key: skill.key,
      name: skill.name,
      description: skill.description,
      source: skill.source,
    };
    setSkills((prev) => {
      const without = prev.filter((entry) => entry.id !== skill.id);
      return [...without, next].toSorted((a, b) => a.key.localeCompare(b.key));
    });
  }, []);

  const loadSkills = useCallback(
    (search?: string) => {
      const requestId = ++listRequestId.current;
      startListTransition(async () => {
        const nextParams = new URLSearchParams({ teamspaceId });
        if (search?.trim()) nextParams.set("q", search.trim());
        const url = search?.trim()
          ? `/api/skills/market/search?${nextParams}`
          : `/api/skills?${nextParams}`;
        const res = await fetch(url);
        if (!res.ok || requestId !== listRequestId.current) return;
        const data = (await res.json()) as {
          skills?: SkillIndex[];
          results?: SkillIndex[];
        };
        setSkills(data.skills ?? data.results ?? []);
      });
    },
    [teamspaceId],
  );

  const loadDetail = useCallback(
    (skillId: string) => {
      startDetailTransition(async () => {
        const res = await fetch(`/api/skills/${skillId}?${teamspaceQuery}`);
        if (!res.ok) return;
        const data = (await res.json()) as SkillDetail;
        setDetail(data);
        mergeSkillIndex(data.skill);
      });
    },
    [mergeSkillIndex, teamspaceQuery],
  );

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    loadDetail(activeId);
  }, [activeId, loadDetail]);

  const activeSkill = skills.find((s) => s.id === activeId) ?? detail?.skill ?? null;
  const skillBody =
    detail?.files.find(
      (f) => f.path === "SKILL.md" || f.path.endsWith("/SKILL.md"),
    )?.contents ?? "";

  const handleDelete = () => {
    if (!activeId || !activeSkill || activeSkill.source !== "custom") return;
    startDelete(async () => {
      const res = await fetch(`/api/skills/${activeId}?${teamspaceQuery}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setActiveId(null);
      setDetail(null);
      setSkills((prev) => prev.filter((skill) => skill.id !== activeId));
      loadSkills(query);
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col" data-testid="skills-workspace">
      <BrowseWorkspace.Frame>
        <BrowseWorkspace.Header
          title="Skills"
          description="Agent skills stored in your organization catalog. Platform builtins are read-only; add custom skills for your team."
          actions={
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              data-testid="skills-create-button"
            >
              <PlusIcon className="size-4" aria-hidden />
              Add skill
            </Button>
          }
        />

        <div className="flex gap-2">
          <Input
            placeholder="Search by name, key, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadSkills(query);
            }}
            data-testid="skills-search-input"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => loadSkills(query)}
          >
            Search
          </Button>
        </div>

        <BrowseWorkspace.Section label="Catalog">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  activeId === skill.id && "bg-muted/30",
                )}
                data-testid={`skill-catalog-item-${skill.key}`}
                onClick={() => setActiveId(skill.id)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {sourceLabel(skill.source)}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{skill.key}</p>
                  {skill.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  ) : null}
                </div>
                <CaretRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            ))}
            {skills.length === 0 && !isPending ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No skills yet. Run db:seed for platform builtins or add a custom skill.
              </p>
            ) : null}
          </div>
        </BrowseWorkspace.Section>

        <p className="text-xs text-muted-foreground">
          Bind skills to agents on the{" "}
          <Link
            href={`/${orgSlug}/${teamspaceSlug}/agents`}
            className="underline underline-offset-2"
          >
            Agents
          </Link>{" "}
          page. Runtime agents load descriptions from bindings and fetch full bodies via{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            read_skill
          </code>
          .
        </p>
      </BrowseWorkspace.Frame>

      <CreateSkillDialog
        open={createOpen}
        teamspaceId={teamspaceId}
        onOpenChange={setCreateOpen}
        onCreated={(skill) => {
          mergeSkillIndex(skill);
          setActiveId(skill.id);
        }}
      />

      <Sheet open={activeSkill !== null} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-xl"
          data-testid="skill-detail-sheet"
        >
          {activeSkill ? (
            <>
              <SheetHeader>
                <SheetTitle>{activeSkill.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {activeSkill.key} · {sourceLabel(activeSkill.source)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {activeSkill.description ? (
                  <p className="text-sm text-muted-foreground">
                    {activeSkill.description}
                  </p>
                ) : null}

                {skillBody ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      SKILL.md
                    </h3>
                    <pre className="max-h-[50vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                      {skillBody}
                    </pre>
                  </div>
                ) : null}

                {activeSkill.source === "custom" && detail ? (
                  <EditCustomSkillForm
                    teamspaceId={teamspaceId}
                    skillId={activeSkill.id}
                    initialName={detail.skill.name}
                    initialDescription={detail.skill.description}
                    initialBody={skillBody}
                    onSaved={() => {
                      loadSkills(query);
                      loadDetail(activeSkill.id);
                    }}
                  />
                ) : null}

                {activeSkill.source === "custom" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    data-testid="skill-delete-button"
                  >
                    <TrashIcon className="size-4" aria-hidden />
                    Delete skill
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CreateSkillDialog({
  open,
  teamspaceId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  teamspaceId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (skill: Skill) => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setKey("");
    setName("");
    setDescription("");
    setBody("");
    setError(null);
  };

  const submit = () => {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/skills/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamspaceId,
          key: key.trim(),
          name: name.trim(),
          description: description.trim(),
          source: "custom",
          body,
        }),
      });
      const data = (await res.json()) as { skill?: Skill; error?: string };
      if (!res.ok || !data.skill) {
        setError(data.error ?? "Failed to create skill");
        return;
      }
      reset();
      onOpenChange(false);
      onCreated(data.skill);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg" data-testid="skill-create-dialog">
        <DialogHeader>
          <DialogTitle>Add custom skill</DialogTitle>
          <DialogDescription>
            Skills are stored in your organization catalog and can be bound to agents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="skill-key">Key</Label>
            <Input
              id="skill-key"
              placeholder="my-team-skill"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              data-testid="skill-create-key"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              placeholder="My Team Skill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="skill-create-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-description">Description</Label>
            <Input
              id="skill-description"
              placeholder="Short summary for the agent manifest"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="skill-create-description"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-body">SKILL.md body</Label>
            <Textarea
              id="skill-body"
              placeholder="Instructions the agent reads via read_skill…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              data-testid="skill-create-body"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !key.trim() || !name.trim()}
            onClick={submit}
            data-testid="skill-create-submit"
          >
            Create skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomSkillForm({
  teamspaceId,
  skillId,
  initialName,
  initialDescription,
  initialBody,
  onSaved,
}: {
  teamspaceId: string;
  skillId: string;
  initialName: string;
  initialDescription: string;
  initialBody: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setBody(initialBody);
  }, [initialName, initialDescription, initialBody]);

  const save = () => {
    startTransition(async () => {
      await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamspaceId,
          name: name.trim(),
          description: description.trim(),
          body,
        }),
      });
      onSaved();
    });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4" data-testid="skill-edit-form">
      <h3 className="text-sm font-medium">Edit custom skill</h3>
      <div className="space-y-1.5">
        <Label htmlFor="skill-edit-name">Name</Label>
        <Input
          id="skill-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skill-edit-description">Description</Label>
        <Input
          id="skill-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skill-edit-body">SKILL.md body</Label>
        <Textarea
          id="skill-edit-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
        />
      </div>
      <Button type="button" size="sm" disabled={isPending} onClick={save}>
        Save changes
      </Button>
    </div>
  );
}

/** Compact catalog panel (Agents page bindings). */
export function SkillsCatalogPanel({ teamspaceId }: { teamspaceId: string }) {
  const [skills, setSkills] = useState<SkillIndex[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadSkills = useCallback(
    (search?: string) => {
      startTransition(async () => {
        const params = new URLSearchParams({ teamspaceId });
        if (search?.trim()) params.set("q", search.trim());
        const url = search?.trim()
          ? `/api/skills/market/search?${params}`
          : `/api/skills?${params}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as {
          skills?: SkillIndex[];
          results?: SkillIndex[];
        };
        setSkills(data.skills ?? data.results ?? []);
      });
    },
    [teamspaceId],
  );

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return (
    <div className="space-y-4" data-testid="skills-catalog-panel">
      <div className="flex gap-2">
        <Input
          placeholder="Search skills by name or key…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadSkills(query);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => loadSkills(query)}
        >
          Search
        </Button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex flex-col gap-1 px-4 py-3"
            data-testid={`skill-catalog-item-${skill.key}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{skill.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {skill.source}
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{skill.key}</p>
            {skill.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {skill.description}
              </p>
            ) : null}
          </div>
        ))}
        {skills.length === 0 && !isPending ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No skills in catalog. Run db:seed to load platform builtins.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AgentSkillBindings({
  teamspaceId,
  agentDefinitionId,
}: {
  teamspaceId: string;
  agentDefinitionId: string;
}) {
  const [catalog, setCatalog] = useState<SkillIndex[]>([]);
  const [boundIds, setBoundIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams({ teamspaceId });
    void Promise.all([
      fetch(`/api/skills?${params}`).then((r) => r.json()),
      fetch(`/api/agents/${agentDefinitionId}/skills?${params}`).then((r) =>
        r.json(),
      ),
    ]).then(([catalogData, boundData]) => {
      setCatalog((catalogData.skills ?? []) as SkillIndex[]);
      const ids = ((boundData.skills ?? []) as SkillIndex[]).map((s) => s.id);
      setBoundIds(new Set(ids));
    });
  }, [teamspaceId, agentDefinitionId]);

  const toggle = (skillId: string) => {
    setBoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      await fetch(`/api/agents/${agentDefinitionId}/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamspaceId,
          skillIds: [...boundIds],
        }),
      });
    });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4" data-testid="agent-skill-bindings">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Bound skills</h3>
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          Save bindings
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Descriptions appear in the agent manifest; full bodies load via read_skill.
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {catalog.map((skill) => (
          <li key={skill.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={boundIds.has(skill.id)}
                onChange={() => toggle(skill.id)}
              />
              <span>
                <span className="font-medium">{skill.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {skill.key}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
