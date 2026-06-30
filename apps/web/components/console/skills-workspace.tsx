"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { SkillIndex } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { cn } from "@ssota/ui/lib/utils";

type SkillsCatalogPanelProps = {
  teamspaceId: string;
};

export function SkillsCatalogPanel({ teamspaceId }: SkillsCatalogPanelProps) {
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

type AgentSkillBindingsProps = {
  teamspaceId: string;
  agentDefinitionId: string;
};

export function AgentSkillBindings({
  teamspaceId,
  agentDefinitionId,
}: AgentSkillBindingsProps) {
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
