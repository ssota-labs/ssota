"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DesignToolchainPackageJson } from "@ssota/contracts/catalog";
import { buildDesignToolchainPropertiesForSave } from "@ssota/contracts/catalog";
import { PageFrame } from "@ssota/ui/components/page-patterns";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";

type DesignToolchainEditorProps = {
  title: string;
  status: string;
  initialPackageJson: DesignToolchainPackageJson;
  initialLockfile: string;
  onSave: (input: {
    title: string;
    packageJson: DesignToolchainPackageJson;
    lockfile: string;
  }) => Promise<void>;
};

export function DesignToolchainEditor({
  title,
  status,
  initialPackageJson,
  initialLockfile,
  onSave,
}: DesignToolchainEditorProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftPackageJson, setDraftPackageJson] = useState(
    JSON.stringify(initialPackageJson, null, 2),
  );
  const [draftLockfile, setDraftLockfile] = useState(initialLockfile);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const packageJson = JSON.parse(draftPackageJson) as DesignToolchainPackageJson;
        setError(null);
        await onSave({
          title: draftTitle,
          packageJson,
          lockfile: draftLockfile,
        });
        router.refresh();
      } catch {
        setError("package.json must be valid JSON");
      }
    });
  };

  return (
    <PageFrame
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline">{status}</Badge>
          <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
        <header className="space-y-2 border-b pb-4">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            aria-label="Title"
            className="h-auto border-0 bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
            placeholder="Design toolchain"
          />
          <p className="text-sm text-muted-foreground">
            Project-level package.json and lockfile for user component builds.
          </p>
        </header>

        <div className="space-y-2">
          <Label htmlFor="package-json">package.json</Label>
          <Textarea
            id="package-json"
            value={draftPackageJson}
            onChange={(event) => setDraftPackageJson(event.target.value)}
            className="min-h-[240px] font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lockfile">pnpm-lock.yaml</Label>
          <Textarea
            id="lockfile"
            value={draftLockfile}
            onChange={(event) => setDraftLockfile(event.target.value)}
            className="min-h-[240px] font-mono text-xs"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <p className="text-xs text-muted-foreground">
          Saved properties:{" "}
          <code className="rounded bg-muted px-1">
            {JSON.stringify(
              buildDesignToolchainPropertiesForSave({
                packageJson: initialPackageJson,
                lockfile: initialLockfile,
              }),
              null,
              0,
            ).slice(0, 120)}
            …
          </code>
        </p>
      </div>
    </PageFrame>
  );
}
