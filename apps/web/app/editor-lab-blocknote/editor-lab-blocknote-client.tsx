"use client";

import type { Block, PartialBlock } from "@blocknote/core";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { createSsotaEditorHostProps } from "@/lib/editor/host-props";
import "./blocknote-lab.css";

const SsotaBlockNoteEditor = dynamic(
  () =>
    import("@/components/editor/blocknote-editor").then(
      (module) => module.SsotaBlockNoteEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-48 animate-pulse rounded-md bg-muted/40"
        data-testid="blocknote-editor-shell"
      />
    ),
  },
);

const SAMPLE: PartialBlock[] = [
  {
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: "SSOTA BlockNote PoC", styles: {} }],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "BlockNote 기반 Notion-like 에디터 비교. ",
        styles: {},
      },
      { type: "text", text: "굵게", styles: { bold: true } },
      { type: "text", text: ", ", styles: {} },
      { type: "text", text: "기울임", styles: { italic: true } },
      { type: "text", text: " 동작 확인.", styles: {} },
    ],
  },
  {
    type: "bulletListItem",
    content: [{ type: "text", text: "한국어 locale (ko)", styles: {} }],
  },
  {
    type: "bulletListItem",
    content: [{ type: "text", text: "JSON 영속화 — 아래 미리보기", styles: {} }],
  },
];

export function EditorLabBlockNoteClient({
  projectId,
}: {
  projectId: string | null;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const uploadImage = useMemo(() => {
    if (!projectId) return undefined;
    return createSsotaEditorHostProps(projectId).uploadImage;
  }, [projectId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="editor-lab-blocknote">
      <div className="rounded-lg border bg-background p-6">
        <SsotaBlockNoteEditor
          initialContent={SAMPLE}
          uploadImage={uploadImage}
          onChange={setBlocks}
        />
      </div>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          editor.document — 영속화될 BlockNote JSON
        </p>
        <pre
          className="overflow-auto text-xs leading-relaxed"
          data-testid="editor-lab-blocknote-json"
        >
          {JSON.stringify(blocks.length > 0 ? blocks : SAMPLE, null, 2)}
        </pre>
      </div>
    </div>
  );
}
