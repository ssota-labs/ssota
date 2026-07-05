"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FolderOpenIcon, GithubLogoIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Skill, SkillFile, SkillIndex } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { cn } from "@ssota/ui/lib/utils";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import {
  SkillDetailCard,
  SkillMarkdownView,
} from "@/components/console/skill-detail-view";
import { CardListSheet, CardListSheetPanel } from "@/components/card-list-sheet";

type SkillDetail = {
  skill: Skill;
  files: Array<{ path: string; contents: string }>;
};

type SkillsTab = "explore" | "library";

type SkillsPageWorkspaceProps = {
  teamspaceId: string;
  orgSlug: string;
  teamspaceSlug: string;
  initialLibrarySkills?: SkillIndex[];
};

function skillOriginFromRecord(
  skill: Skill | SkillIndex,
): SkillIndex["origin"] | undefined {
  if ("origin" in skill && skill.origin) return skill.origin;
  if ("metadata" in skill) {
    if (skill.metadata?.catalogSource) return "github";
    if (skill.source === "skills_sh") return "skills_sh";
    if (skill.metadata?.kind === "community") return "community";
    return "inline";
  }
  return undefined;
}

function originLabel(origin: SkillIndex["origin"] | undefined) {
  if (origin === "github") return "GitHub";
  if (origin === "skills_sh" || origin === "community") return "Community";
  if (origin === "inline") return "Custom";
  return null;
}

export function SkillsPageWorkspace({
  teamspaceId,
  orgSlug,
  teamspaceSlug,
  initialLibrarySkills = [],
}: SkillsPageWorkspaceProps) {
  const [tab, setTab] = useState<SkillsTab>("library");
  const [librarySkills, setLibrarySkills] = useState<SkillIndex[]>(initialLibrarySkills);
  const [exploreSkills, setExploreSkills] = useState<SkillIndex[]>([]);
  const [query, setQuery] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [isPending, startListTransition] = useTransition();
  const [, startDetailTransition] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const listRequestId = useRef(0);

  const teamspaceQuery = `teamspaceId=${teamspaceId}`;
  const activeList = tab === "library" ? librarySkills : exploreSkills;
  const activeSkill =
    activeList.find((s) => s.id === activeId) ?? detail?.skill ?? null;

  const mergeLibraryIndex = useCallback((skill: Skill) => {
    const next: SkillIndex = {
      id: skill.id,
      key: skill.key,
      name: skill.name,
      description: skill.description,
      source: skill.source,
      origin:
        skill.metadata?.catalogSource != null
          ? "github"
          : skill.source === "skills_sh"
            ? "skills_sh"
            : "inline",
    };
    setLibrarySkills((prev) => {
      const without = prev.filter((entry) => entry.id !== skill.id);
      return [...without, next].toSorted((a, b) => a.key.localeCompare(b.key));
    });
  }, []);

  const loadLibrary = useCallback(
    (search?: string) => {
      const requestId = ++listRequestId.current;
      startListTransition(async () => {
        const params = new URLSearchParams({ teamspaceId });
        if (search?.trim()) params.set("q", search.trim());
        const res = await fetch(`/api/skills/library?${params}`);
        if (!res.ok || requestId !== listRequestId.current) return;
        const data = (await res.json()) as { skills?: SkillIndex[] };
        let skills = data.skills ?? [];
        const q = search?.trim().toLowerCase();
        if (q) {
          skills = skills.filter(
            (s) =>
              s.key.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q),
          );
        }
        setLibrarySkills(skills);
      });
    },
    [teamspaceId],
  );

  const loadExplore = useCallback(
    (search?: string) => {
      const requestId = ++listRequestId.current;
      startListTransition(async () => {
        const params = new URLSearchParams({ teamspaceId });
        if (search?.trim()) params.set("q", search.trim());
        const res = await fetch(`/api/skills/explore?${params}`);
        if (!res.ok || requestId !== listRequestId.current) return;
        const data = (await res.json()) as { skills?: SkillIndex[] };
        setExploreSkills(data.skills ?? []);
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
        if (tab === "library") {
          mergeLibraryIndex(data.skill);
        }
      });
    },
    [mergeLibraryIndex, tab, teamspaceQuery],
  );

  useEffect(() => {
    if (initialLibrarySkills.length === 0) {
      loadLibrary();
    }
    loadExplore();
  }, [initialLibrarySkills.length, loadExplore, loadLibrary]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    loadDetail(activeId);
  }, [activeId, loadDetail]);

  const skillBody =
    detail?.files.find(
      (f) => f.path === "SKILL.md" || f.path.endsWith("/SKILL.md"),
    )?.contents ?? "";

  const handleSearch = () => {
    if (tab === "library") loadLibrary(query);
    else loadExplore(query);
  };

  const handleSaveToLibrary = (skillId: string) => {
    startListTransition(async () => {
      const res = await fetch("/api/skills/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamspaceId, skillId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { skill?: Skill };
      if (data.skill) {
        mergeLibraryIndex(data.skill);
        setExploreSkills((prev) => prev.filter((s) => s.id !== skillId));
        setTab("library");
        setActiveId(data.skill.id);
      }
    });
  };

  const handleRemoveFromLibrary = () => {
    if (!activeId || tab !== "library") return;
    startRemove(async () => {
      const res = await fetch(`/api/skills/library/${activeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamspaceId }),
      });
      if (!res.ok) return;
      setActiveId(null);
      setDetail(null);
      setLibrarySkills((prev) => prev.filter((skill) => skill.id !== activeId));
      loadExplore(query);
    });
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      data-testid="skills-workspace"
    >
      <CardListSheet.Root
        activeId={activeId}
        onActiveIdChange={setActiveId}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div className="h-full overflow-y-auto">
          <BrowseWorkspace.Frame>
            <BrowseWorkspace.Header
              title="Skills"
              description="Explore community skills or manage your organization's saved library. Platform defaults are attached to the main agent automatically."
              actions={
                tab === "library" ? (
                  <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                    <DropdownMenuTrigger
                      render={
                        <Button type="button" data-testid="skills-add-button">
                          <PlusIcon className="size-4" aria-hidden />
                          Add skill
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setAddMenuOpen(false);
                          setCreateOpen(true);
                        }}
                        data-testid="skills-add-custom"
                      >
                        Custom (SKILL.md)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setAddMenuOpen(false);
                          setGithubOpen(true);
                        }}
                        data-testid="skills-add-github"
                      >
                        <GithubLogoIcon className="size-4" aria-hidden />
                        Import from GitHub
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setAddMenuOpen(false);
                          setFolderOpen(true);
                        }}
                        data-testid="skills-add-folder"
                      >
                        <FolderOpenIcon className="size-4" aria-hidden />
                        Upload folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />

            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value as SkillsTab);
                setActiveId(null);
                setQuery("");
              }}
            >
              <TabsList>
                <TabsTrigger value="explore" data-testid="skills-tab-explore">
                  Explore
                </TabsTrigger>
                <TabsTrigger value="library" data-testid="skills-tab-library">
                  My library
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Search by name, key, or description…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  data-testid="skills-search-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>

              <TabsContent value="explore" className="mt-4">
                <BrowseWorkspace.Section label="Community">
                  <SkillIndexList
                    skills={exploreSkills}
                    isPending={isPending}
                    emptyMessage="No community skills to explore. Check back after catalog updates."
                    renderAction={(skill) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToLibrary(skill.id);
                        }}
                        data-testid={`skill-save-${skill.key}`}
                      >
                        Save to library
                      </Button>
                    )}
                  />
                </BrowseWorkspace.Section>
              </TabsContent>

              <TabsContent value="library" className="mt-4">
                <BrowseWorkspace.Section label="My library">
                  <SkillIndexList
                    skills={librarySkills}
                    isPending={isPending}
                    emptyMessage="Your library is empty. Explore community skills or add a custom, GitHub, or folder skill."
                    testIdPrefix="skill-library-item"
                  />
                </BrowseWorkspace.Section>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              Bind library skills to agents on the{" "}
              <Link
                href={`/${orgSlug}/${teamspaceSlug}/agents`}
                className="underline underline-offset-2"
              >
                Agents
              </Link>{" "}
              page.
            </p>
          </BrowseWorkspace.Frame>
        </div>

        {activeSkill ? (
          <CardListSheetPanel
            testId="skill-detail-sheet"
            title={activeSkill.name}
            subtitle={`${activeSkill.key}${(() => {
              const origin = skillOriginFromRecord(activeSkill);
              return originLabel(origin) ? ` · ${originLabel(origin)}` : "";
            })()}`}
            onClose={() => setActiveId(null)}
            footer={
              tab === "library" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isRemoving}
                  onClick={handleRemoveFromLibrary}
                  data-testid="skill-remove-from-library"
                >
                  <TrashIcon className="size-4" aria-hidden />
                  Remove from library
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleSaveToLibrary(activeSkill.id)}
                  data-testid="skill-detail-save-to-library"
                >
                  Save to library
                </Button>
              )
            }
          >
            <div className="space-y-4">
              {activeSkill.description.trim() ? (
                <SkillDetailCard title="Description" testId="skill-detail-description">
                  <SkillMarkdownView
                    markdown={activeSkill.description}
                    viewKey={`${activeSkill.id}-description`}
                  />
                </SkillDetailCard>
              ) : null}

              {skillBody.trim() ? (
                <SkillDetailCard title="SKILL.md" testId="skill-detail-body">
                  <SkillMarkdownView
                    markdown={skillBody}
                    viewKey={`${activeSkill.id}-body`}
                  />
                </SkillDetailCard>
              ) : null}

              {tab === "library" &&
              activeSkill.source === "custom" &&
              skillOriginFromRecord(activeSkill) === "inline" &&
              detail ? (
                <SkillDetailCard title="Edit" testId="skill-detail-edit">
                  <EditCustomSkillForm
                    teamspaceId={teamspaceId}
                    skillId={activeSkill.id}
                    initialName={detail.skill.name}
                    initialDescription={detail.skill.description}
                    initialBody={skillBody}
                    onSaved={() => {
                      loadLibrary(query);
                      loadDetail(activeSkill.id);
                    }}
                  />
                </SkillDetailCard>
              ) : null}
            </div>
          </CardListSheetPanel>
        ) : null}
      </CardListSheet.Root>

      <CreateSkillDialog
        open={createOpen}
        teamspaceId={teamspaceId}
        onOpenChange={setCreateOpen}
        onCreated={(skill) => {
          mergeLibraryIndex(skill);
          setActiveId(skill.id);
          setTab("library");
        }}
      />

      <GithubSkillDialog
        open={githubOpen}
        teamspaceId={teamspaceId}
        onOpenChange={setGithubOpen}
        onCreated={(skill) => {
          mergeLibraryIndex(skill);
          setActiveId(skill.id);
        }}
      />

      <FolderUploadDialog
        open={folderOpen}
        teamspaceId={teamspaceId}
        onOpenChange={setFolderOpen}
        onCreated={(skill) => {
          mergeLibraryIndex(skill);
          setActiveId(skill.id);
        }}
      />
    </div>
  );
}

function SkillIndexList({
  skills,
  isPending,
  emptyMessage,
  renderAction,
  testIdPrefix = "skill-catalog-item",
}: {
  skills: SkillIndex[];
  isPending: boolean;
  emptyMessage: string;
  renderAction?: (skill: SkillIndex) => React.ReactNode;
  testIdPrefix?: string;
}) {
  return (
    <CardListSheet.List className="border-border">
      {skills.map((skill) => (
        <CardListSheet.Row
          key={skill.id}
          id={skill.id}
          testId={`${testIdPrefix}-${skill.key}`}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{skill.name}</span>
              {originLabel(skill.origin) ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {originLabel(skill.origin)}
                </span>
              ) : null}
            </div>
            {skill.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {skill.description}
              </p>
            ) : null}
          </div>
          {renderAction?.(skill)}
          {!renderAction ? <CardListSheet.RowCaret /> : null}
        </CardListSheet.Row>
      ))}
      {skills.length === 0 && !isPending ? (
        <CardListSheet.Empty>{emptyMessage}</CardListSheet.Empty>
      ) : null}
    </CardListSheet.List>
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
            Write SKILL.md content inline. The skill is saved to your library.
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
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !key.trim() || !name.trim()}
            onClick={submit}
            data-testid="skill-create-submit"
          >
            Add to library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GithubSkillDialog({
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
  const [repo, setRepo] = useState("");
  const [skillPath, setSkillPath] = useState("SKILL.md");
  const [ref, setRef] = useState("main");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setKey("");
    setName("");
    setDescription("");
    setRepo("");
    setSkillPath("SKILL.md");
    setRef("main");
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
          metadata: {
            kind: "custom",
            catalogSource: {
              source: repo.trim(),
              sourceType: "github",
              skillPath: skillPath.trim() || "SKILL.md",
              ref: ref.trim() || "main",
            },
          },
        }),
      });
      const data = (await res.json()) as { skill?: Skill; error?: string; detail?: string };
      if (!res.ok || !data.skill) {
        setError(data.error ?? data.detail ?? "Failed to import skill");
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
      <DialogContent className="sm:max-w-lg" data-testid="skill-github-dialog">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Fetch SKILL.md (and references) from a public repository path.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="github-key">Key</Label>
            <Input
              id="github-key"
              placeholder="my-github-skill"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              data-testid="skill-github-key"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-name">Name</Label>
            <Input
              id="github-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="skill-github-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-description">Description</Label>
            <Input
              id="github-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-repo">Repository</Label>
            <Input
              id="github-repo"
              placeholder="owner/repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              data-testid="skill-github-repo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-path">Skill path</Label>
            <Input
              id="github-path"
              placeholder=".agents/skills/my-skill/SKILL.md"
              value={skillPath}
              onChange={(e) => setSkillPath(e.target.value)}
              data-testid="skill-github-path"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-ref">Git ref</Label>
            <Input
              id="github-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !key.trim() || !name.trim() || !repo.trim()}
            onClick={submit}
            data-testid="skill-github-submit"
          >
            Import to library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderUploadDialog({
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
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setKey("");
    setName("");
    setDescription("");
    setFiles([]);
    setError(null);
  };

  const onFolderPick = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const root = fileList[0]?.webkitRelativePath.split("/")[0] ?? "skill";
    const next: SkillFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.endsWith(".md")) continue;
      const relative = file.webkitRelativePath.includes("/")
        ? file.webkitRelativePath.slice(file.webkitRelativePath.indexOf("/") + 1)
        : file.name;
      next.push({
        path: relative.replace(/\\/g, "/"),
        contents: await file.text(),
      });
    }
    if (next.length === 0) {
      setError("Folder must include at least one .md file (SKILL.md recommended).");
      return;
    }
    setFiles(next);
    if (!key.trim()) setKey(root.replace(/[^a-z0-9-]/gi, "-").toLowerCase());
    if (!name.trim()) setName(root);
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
          files,
        }),
      });
      const data = (await res.json()) as { skill?: Skill; error?: string };
      if (!res.ok || !data.skill) {
        setError(data.error ?? "Failed to upload skill");
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
      <DialogContent className="sm:max-w-lg" data-testid="skill-folder-dialog">
        <DialogHeader>
          <DialogTitle>Upload skill folder</DialogTitle>
          <DialogDescription>
            Select a folder containing SKILL.md and optional reference files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="folder-pick">Folder</Label>
            <Input
              id="folder-pick"
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is supported in Chromium
              webkitdirectory=""
              onChange={(e) => void onFolderPick(e.target.files)}
              data-testid="skill-folder-input"
            />
            {files.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {files.length} file(s) selected
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folder-key">Key</Label>
            <Input
              id="folder-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              data-testid="skill-folder-key"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folder-description">Description</Label>
            <Input
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !key.trim() || !name.trim() || files.length === 0}
            onClick={submit}
            data-testid="skill-folder-submit"
          >
            Upload to library
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
    <div className="space-y-3" data-testid="skill-edit-form">
      <div className="space-y-1.5">
        <Label htmlFor="skill-edit-name">Name</Label>
        <Input id="skill-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
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

/** Compact library list (Agents page bindings). */
export function SkillsCatalogPanel({ teamspaceId }: { teamspaceId: string }) {
  const [skills, setSkills] = useState<SkillIndex[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadSkills = useCallback(
    (search?: string) => {
      startTransition(async () => {
        const params = new URLSearchParams({ teamspaceId });
        const res = await fetch(`/api/skills/library?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as { skills?: SkillIndex[] };
        let next = data.skills ?? [];
        const q = search?.trim().toLowerCase();
        if (q) {
          next = next.filter(
            (s) =>
              s.key.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q),
          );
        }
        setSkills(next);
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
          placeholder="Search library skills…"
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
              {originLabel(skill.origin) ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {originLabel(skill.origin)}
                </span>
              ) : null}
            </div>
            {skill.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {skill.description}
              </p>
            ) : null}
          </div>
        ))}
        {skills.length === 0 && !isPending ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No skills in your library yet. Add skills from the Skills page.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AgentSkillBindings({
  teamspaceId,
  agentDefinitionId,
  embedded = false,
}: {
  teamspaceId: string;
  agentDefinitionId: string;
  embedded?: boolean;
}) {
  const [catalog, setCatalog] = useState<SkillIndex[]>([]);
  const [boundIds, setBoundIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams({ teamspaceId });
    void Promise.all([
      fetch(`/api/skills/library?${params}`).then((r) => r.json()),
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
    <div
      className={cn("space-y-3", embedded ? undefined : "border-t border-border pt-4")}
      data-testid="agent-skill-bindings"
    >
      <div
        className={cn(
          "flex items-center gap-2",
          embedded ? "justify-end" : "justify-between",
        )}
      >
        {!embedded ? <h3 className="text-sm font-medium">Bound skills</h3> : null}
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          Save bindings
        </Button>
      </div>
      {!embedded ? (
        <p className="text-xs text-muted-foreground">
          Library skills only. The main agent includes platform defaults separately.
        </p>
      ) : null}
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {catalog.map((skill) => (
          <li key={skill.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md text-sm hover:bg-muted/40",
                embedded ? "px-1 py-2" : "px-2 py-1.5",
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
