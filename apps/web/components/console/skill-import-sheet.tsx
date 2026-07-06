"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { DiscoveredSkill, ImportSkillResult, Skill } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ssota/ui/components/ui/tabs";
import { cn } from "@ssota/ui/lib/utils";
import { CardListSheetPanel } from "@/components/card-list-sheet";
import {
  buildFolderImportItems,
  buildGithubImportItems,
  discoverSkillsFromFolderFiles,
  groupDiscoveredSkills,
  isSkillImportCheckedByDefault,
  isSkillImportSelectable,
  libraryStatusLabel,
  readFolderSkillFiles,
} from "@/lib/console/skill-import";
import type { LibrarySkillRef } from "@ssota/core";

export type SkillImportTab = "github" | "folder";

type SkillImportSheetProps = {
  open: boolean;
  teamspaceId: string;
  initialTab: SkillImportTab;
  onOpenChange: (open: boolean) => void;
  onImported: (skills: Skill[]) => void;
};

function initialSelection(skills: DiscoveredSkill[]): Set<string> {
  return new Set(
    skills
      .filter((skill) => isSkillImportCheckedByDefault(skill.libraryStatus))
      .map((skill) => skill.skillPath),
  );
}

export function SkillImportSheet({
  open,
  teamspaceId,
  initialTab,
  onOpenChange,
  onImported,
}: SkillImportSheetProps) {
  const [tab, setTab] = useState<SkillImportTab>(initialTab);
  const [repo, setRepo] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredSkill[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [folderRootName, setFolderRootName] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<
    Array<{ path: string; contents: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, startDiscover] = useTransition();
  const [isImporting, startImport] = useTransition();

  const reset = useCallback(() => {
    setTab(initialTab);
    setRepo("");
    setDiscovered([]);
    setSkippedCount(0);
    setSelectedPaths(new Set());
    setFolderRootName(null);
    setFolderFiles([]);
    setError(null);
  }, [initialTab]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const applyDiscovery = (skills: DiscoveredSkill[], skipped: number) => {
    setDiscovered(skills);
    setSkippedCount(skipped);
    setSelectedPaths(initialSelection(skills));
    if (skills.length === 0) {
      setError("No valid skills found. Check that SKILL.md files follow Agent Skills format.");
    }
  };

  const discoverGithub = () => {
    startDiscover(async () => {
      setError(null);
      const trimmedRepo = repo.trim();
      if (!trimmedRepo) {
        setError("Enter a repository (owner/repo).");
        return;
      }
      const params = new URLSearchParams({ teamspaceId, repo: trimmedRepo });
      const res = await fetch(`/api/skills/discover/github?${params}`);
      const data = (await res.json()) as {
        skills?: DiscoveredSkill[];
        skippedCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to discover skills");
        return;
      }
      applyDiscovery(data.skills ?? [], data.skippedCount ?? 0);
    });
  };

  const discoverFolder = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    startDiscover(async () => {
      setError(null);
      try {
        const { rootName, files } = await readFolderSkillFiles(fileList);
        if (files.length === 0) {
          setError("Folder must include at least one file.");
          return;
        }
        const refsRes = await fetch(
          `/api/skills/library/import-refs?teamspaceId=${teamspaceId}`,
        );
        if (!refsRes.ok) {
          setError("Failed to load library for matching.");
          return;
        }
        const refsData = (await refsRes.json()) as { refs?: LibrarySkillRef[] };
        const { skills, skippedCount: skipped } = discoverSkillsFromFolderFiles(
          files,
          refsData.refs ?? [],
          rootName,
        );
        setFolderRootName(rootName);
        setFolderFiles(files);
        applyDiscovery(skills, skipped);
      } catch {
        setError("Failed to read folder.");
      }
    });
  };

  const toggleSkill = (skillPath: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (checked) next.add(skillPath);
      else next.delete(skillPath);
      return next;
    });
  };

  const importSelected = () => {
    startImport(async () => {
      setError(null);
      const items =
        tab === "github"
          ? buildGithubImportItems(discovered, selectedPaths, repo)
          : buildFolderImportItems(
              discovered,
              selectedPaths,
              folderFiles,
              folderRootName ?? "skill-pack",
            );

      if (items.length === 0) {
        setError("Select at least one skill to import.");
        return;
      }

      const res = await fetch("/api/skills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamspaceId, items }),
      });
      const data = (await res.json()) as {
        results?: ImportSkillResult[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      const results = data.results ?? [];
      const imported = results.filter((r) => r.ok && r.skill).map((r) => r.skill!);
      const failures = results.filter((r) => !r.ok);
      if (imported.length === 0) {
        setError(failures[0]?.error ?? "Import failed");
        return;
      }

      reset();
      onOpenChange(false);
      onImported(imported);
    });
  };

  const groups = useMemo(() => groupDiscoveredSkills(discovered), [discovered]);
  const selectedCount = selectedPaths.size;
  const isBusy = isDiscovering || isImporting;

  if (!open) return null;

  return (
    <CardListSheetPanel
      testId="skill-import-dialog"
      title="Import skills"
      subtitle="Discover skills from a GitHub repository or local folder, then import selected items."
      onClose={close}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isBusy || selectedCount === 0}
            onClick={importSelected}
            data-testid="skill-import-submit"
          >
            {isImporting
              ? "Importing…"
              : `Import ${selectedCount} skill${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      }
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as SkillImportTab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="github" data-testid="skill-import-tab-github">
            GitHub
          </TabsTrigger>
          <TabsTrigger value="folder" data-testid="skill-import-tab-folder">
            Folder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="github" className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="skill-import-repo">Repository</Label>
            <div className="flex gap-2">
              <Input
                id="skill-import-repo"
                placeholder="owner/repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                data-testid="skill-import-repo"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isBusy || !repo.trim()}
                onClick={discoverGithub}
                data-testid="skill-import-discover-github"
              >
                {isDiscovering ? "Discovering…" : "Discover"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="folder" className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="skill-import-folder">Folder</Label>
            <Input
              id="skill-import-folder"
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is supported in Chromium
              webkitdirectory=""
              disabled={isBusy}
              onChange={(e) => void discoverFolder(e.target.files)}
              data-testid="skill-import-folder-input"
            />
            {folderRootName ? (
              <p className="text-xs text-muted-foreground">
                {folderRootName} — {folderFiles.length} file(s)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a folder containing SKILL.md files and optional references.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {skippedCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {skippedCount} invalid skill file(s) were skipped.
        </p>
      ) : null}

      {discovered.length > 0 ? (
        <div className="mt-4 space-y-4" data-testid="skill-import-results">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {group.skills.map((skill) => (
                  <SkillImportRow
                    key={skill.skillPath}
                    skill={skill}
                    checked={selectedPaths.has(skill.skillPath)}
                    onCheckedChange={(checked) => toggleSkill(skill.skillPath, checked)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </CardListSheetPanel>
  );
}

function SkillImportRow({
  skill,
  checked,
  onCheckedChange,
}: {
  skill: DiscoveredSkill;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const selectable = isSkillImportSelectable(skill.libraryStatus);
  const badge = libraryStatusLabel(skill);

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-3 py-2.5",
        !selectable && "opacity-60",
      )}
      data-testid={`skill-import-row-${skill.suggestedKey}`}
    >
      <Checkbox
        checked={checked}
        disabled={!selectable}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
        data-testid={`skill-import-check-${skill.suggestedKey}`}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{skill.displayName}</span>
          {badge ? (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {skill.description}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {skill.skillPath}
        </p>
      </div>
    </li>
  );
}
