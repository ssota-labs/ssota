"use client";

import { CaretDownIcon, CaretRightIcon, FileIcon, FolderIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@ssota/ui/lib/utils";
import { SkillMarkdownSkeleton, SkillMarkdownView } from "@/components/console/skill-detail-view";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";

export type SkillFileEntry = { path: string; contents: string };

type FileTreeNode = {
  id: string;
  label: string;
  kind: "file" | "folder";
  children?: FileTreeNode[];
};

function pathsToTree(files: SkillFileEntry[], packagePrefix: string): FileTreeNode[] {
  type DirLeaf = { __file: string };
  interface DirBranch {
    [segment: string]: DirLeaf | DirBranch;
  }

  const root: DirBranch = {};

  for (const file of files) {
    const displayPath = stripPackagePrefix(file.path, packagePrefix);
    const parts = displayPath.split("/").filter(Boolean);
    let node: DirBranch = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      const existing = node[part];
      if (isLast) {
        node[part] = { __file: file.path };
      } else if (!existing || "__file" in existing) {
        node[part] = {};
        node = node[part] as DirBranch;
      } else {
        node = existing as DirBranch;
      }
    }
  }

  function convert(obj: DirBranch, prefix = ""): FileTreeNode[] {
    return Object.keys(obj)
      .toSorted((a, b) => {
        const aNode = obj[a]!;
        const bNode = obj[b]!;
        const aIsFile = "__file" in aNode;
        const bIsFile = "__file" in bNode;
        if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
        return a.localeCompare(b);
      })
      .map((key) => {
        const child = obj[key]!;
        const id = prefix ? `${prefix}/${key}` : key;
        if ("__file" in child) {
          return { id: (child as DirLeaf).__file, label: key, kind: "file" as const };
        }
        return {
          id: `${id}/`,
          label: key,
          kind: "folder" as const,
          children: convert(child as DirBranch, id),
        };
      });
  }

  return convert(root);
}

export function defaultSkillMdPath(files: SkillFileEntry[]): string | null {
  const match = files.find(
    (f) => f.path === "SKILL.md" || f.path.endsWith("/SKILL.md"),
  );
  return match?.path ?? files[0]?.path ?? null;
}

/** Directory prefix to strip so the tree shows skill-package paths, not full repo paths. */
export function skillPackageRootPrefix(files: SkillFileEntry[]): string {
  const skillMdPath = defaultSkillMdPath(files);
  if (!skillMdPath) return "";
  const normalized = skillMdPath.replace(/\\/g, "/");
  if (normalized === "SKILL.md") return "";
  const dir = normalized.slice(0, -"/SKILL.md".length);
  return dir ? `${dir}/` : "";
}

function stripPackagePrefix(path: string, prefix: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (!prefix) return normalized;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

function pathToTestId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

function collectFolderIds(nodes: FileTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: FileTreeNode[]) => {
    for (const node of list) {
      if (node.kind === "folder") {
        ids.add(node.id);
        walk(node.children ?? []);
      }
    }
  };
  walk(nodes);
  return ids;
}

function TreeRow({
  node,
  depth,
  selectedPath,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const paddingLeft = depth * 12 + 8;

  if (node.kind === "folder") {
    const isOpen = expandedFolders.has(node.id);
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.id)}
          className="flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          style={{ paddingLeft }}
          data-testid={`skill-file-tree-folder-${pathToTestId(node.id)}`}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <CaretDownIcon className="size-3 shrink-0" aria-hidden />
          ) : (
            <CaretRightIcon className="size-3 shrink-0" aria-hidden />
          )}
          <FolderIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{node.label}</span>
        </button>
        {isOpen
          ? node.children?.map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))
          : null}
      </div>
    );
  }

  const isSelected = selectedPath === node.id;

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.id)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition-colors hover:bg-muted/60",
        isSelected
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      style={{ paddingLeft }}
      data-testid={`skill-file-tree-file-${pathToTestId(node.id)}`}
      aria-current={isSelected ? "true" : undefined}
    >
      <FileIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{node.label}</span>
    </button>
  );
}

function SkillFilePreview({
  path,
  contents,
  viewKey,
}: {
  path: string;
  contents: string;
  viewKey: string;
}) {
  if (isMarkdownPath(path)) {
    return (
      <SkillMarkdownView markdown={contents} viewKey={`${viewKey}:${path}`} />
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
      {contents}
    </pre>
  );
}

export function SkillFileExplorerSkeleton({
  className,
  previewTestId = "skill-detail-body-skeleton",
}: {
  className?: string;
  previewTestId?: string;
}) {
  return (
    <div
      className={cn("flex min-h-0 flex-col sm:flex-row", className)}
      data-testid="skill-file-explorer-skeleton"
      aria-busy="true"
      aria-label="Loading skill files"
    >
      <nav
        className="shrink-0 space-y-1 border-b border-border bg-muted/15 p-1.5 sm:max-h-[min(24rem,45vh)] sm:w-[7.5rem] sm:border-b-0 sm:border-r"
        aria-hidden
      >
        <Skeleton className="ml-2 h-3.5 w-[70%] rounded-sm" />
        <Skeleton className="ml-2 h-3.5 w-[55%] rounded-sm" />
        <Skeleton className="ml-5 h-3.5 w-[62%] rounded-sm" />
      </nav>
      <div
        className="min-h-0 min-w-0 flex-1 px-3 py-2 sm:max-h-[min(24rem,45vh)]"
        data-testid={previewTestId}
      >
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16 rounded-sm" />
          <SkillMarkdownSkeleton />
        </div>
      </div>
    </div>
  );
}

export function SkillFileExplorer({
  files,
  skillId,
  selectedPath,
  onSelectedPathChange,
  className,
}: {
  files: SkillFileEntry[];
  skillId: string;
  selectedPath: string | null;
  onSelectedPathChange: (path: string) => void;
  className?: string;
}) {
  const packagePrefix = useMemo(() => skillPackageRootPrefix(files), [files]);
  const tree = useMemo(
    () => pathsToTree(files, packagePrefix),
    [files, packagePrefix],
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() =>
    collectFolderIds(tree),
  );

  useEffect(() => {
    setExpandedFolders(collectFolderIds(tree));
  }, [tree]);

  const selectedFile = files.find((f) => f.path === selectedPath) ?? null;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        No files in this skill package.
      </p>
    );
  }

  const previewTestId =
    selectedPath &&
    (selectedPath === "SKILL.md" || selectedPath.endsWith("/SKILL.md"))
      ? "skill-detail-body"
      : "skill-file-preview";

  return (
    <div
      className={cn("flex min-h-0 flex-col sm:flex-row", className)}
      data-testid="skill-file-explorer"
    >
      <nav
        className="shrink-0 overflow-y-auto border-b border-border bg-muted/15 sm:max-h-[min(24rem,45vh)] sm:w-[7.5rem] sm:border-b-0 sm:border-r"
        aria-label="Skill files"
        data-testid="skill-file-tree"
      >
        <div className="space-y-0.5 p-1.5">
          {tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onSelectFile={onSelectedPathChange}
            />
          ))}
        </div>
      </nav>

      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-2 sm:max-h-[min(24rem,45vh)]"
        data-testid={previewTestId}
      >
        {selectedFile ? (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {stripPackagePrefix(selectedFile.path, packagePrefix)}
            </p>
            <SkillFilePreview
              path={selectedFile.path}
              contents={selectedFile.contents}
              viewKey={skillId}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a file from the tree to preview its contents.
          </p>
        )}
      </div>
    </div>
  );
}
