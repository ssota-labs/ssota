"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";

type LabMode = "catalog" | "pages" | "nav" | "ui-catalog";

const UI_CATALOG_KEYS = [
  "PageHeader",
  "SplitPane",
  "Tabs",
  "Text",
  "Badge",
  "Card",
  "NodeList",
  "NodeDocument",
  "NodeField",
  "EdgeList",
  "BlockNoteEditor",
];

export function CatalogLabEditor({
  projectId,
  orgSlug,
  projectSlug,
  mode,
  initialJson = "",
}: {
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  mode: LabMode;
  initialJson?: string;
}) {
  const [json, setJson] = useState(initialJson);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titles: Record<LabMode, string> = {
    catalog: "L1 — Node / Edge catalog",
    pages: "L3 — PageRuntimeDefinition",
    nav: "L4 — Workspace nav",
    "ui-catalog": "L2 — UI component keys",
  };

  async function validate() {
    setMessage(null);
    setError(null);
    const res = await fetch(
      `/${orgSlug}/${projectSlug}/lab/api/validate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, json, projectId }),
      },
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      setError(body.error ?? "Validation failed");
      return;
    }
    setMessage("Valid JSON");
  }

  if (mode === "ui-catalog") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
        <ul className="list-disc pl-6 text-sm">
          {UI_CATALOG_KEYS.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
      <p className="text-muted-foreground text-sm">
        JSON validate only — no live renderer in this release.
      </p>
      <Textarea
        className="min-h-[320px] font-mono text-sm"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder="Paste JSON…"
      />
      <div className="flex gap-2">
        <Button type="button" onClick={() => void validate()}>
          Validate
        </Button>
      </div>
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
