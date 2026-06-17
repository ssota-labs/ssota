"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DESIGN_THEME_TOKEN_MANIFEST,
  mergeDesignThemeTokens,
  type DesignThemeTokenMap,
} from "@ssota/contracts/catalog";
import { PageFrame } from "@ssota/ui/components/page-patterns";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  formatLengthFromPx,
  parseLengthToPx,
} from "@ssota/ui/design-lab";
import { buildDesignThemePropertiesForSave } from "@/lib/design-studio/resolve-project-theme";

type DesignThemeEditorProps = {
  title: string;
  status: string;
  initialTokens: DesignThemeTokenMap;
  initialContent: string;
  onSave: (input: {
    title: string;
    tokens: DesignThemeTokenMap;
    content: string;
  }) => Promise<void>;
};

export function DesignThemeEditor({
  title,
  status,
  initialTokens,
  initialContent,
  onSave,
}: DesignThemeEditorProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftTokens, setDraftTokens] = useState(initialTokens);
  const [draftContent, setDraftContent] = useState(initialContent);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await onSave({
        title: draftTitle,
        tokens: draftTokens,
        content: draftContent,
      });
      router.refresh();
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
            placeholder="Design theme"
          />
        </header>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium">Theme tokens</h2>
            <p className="text-xs text-muted-foreground">
              Semantic tokens used by the design studio preview, inspector, and
              component builds.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DESIGN_THEME_TOKEN_MANIFEST.map((token) => {
              const current =
                draftTokens[token.name] ??
                mergeDesignThemeTokens()[token.name] ??
                token.defaultValue;

              if (token.kind === "color") {
                return (
                  <label key={token.name} className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {token.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-8 shrink-0 rounded-md border border-border"
                        style={{ backgroundColor: current }}
                      />
                      <Input
                        value={current}
                        onChange={(event) =>
                          setDraftTokens((prev) => ({
                            ...prev,
                            [token.name]: event.target.value,
                          }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </label>
                );
              }

              const px = parseLengthToPx(current);
              return (
                <label key={token.name} className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span>{token.label}</span>
                    <span className="font-mono text-foreground">{current}</span>
                  </span>
                  <input
                    type="range"
                    min={token.min ?? 0}
                    max={token.max ?? 24}
                    step={token.step ?? 1}
                    value={px}
                    onChange={(event) =>
                      setDraftTokens((prev) => ({
                        ...prev,
                        [token.name]: formatLengthFromPx(
                          Number(event.target.value),
                        ),
                      }))
                    }
                    className="w-full"
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="design-theme-guide">Guidelines (optional)</Label>
          <Textarea
            id="design-theme-guide"
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            rows={8}
            placeholder="Brand usage notes, accessibility guidance, etc."
          />
        </section>
      </div>
    </PageFrame>
  );
}
