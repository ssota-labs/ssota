"use client";

import { SsotaEditor, type JSONContent } from "@ssota/editor";
import "@ssota/editor/styles.css";
import { useState } from "react";

const SAMPLE: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "SSOTA 에디터 스파이크" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Tiptap 3 기반 Notion-like 에디터 Phase 0. " },
        { type: "text", marks: [{ type: "bold" }], text: "굵게" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "기울임" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "code" }], text: "inline code" },
        { type: "text", text: " 동작 확인." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "SSR 안전 (immediatelyRender:false)" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "JSON 영속화 — 아래 미리보기" }],
            },
          ],
        },
      ],
    },
  ],
};

export function EditorLabClient() {
  const [doc, setDoc] = useState<JSONContent>(SAMPLE);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-background p-6">
        <SsotaEditor content={SAMPLE} onChange={setDoc} />
      </div>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          editor.getJSON() — 영속화될 ProseMirror 문서
        </p>
        <pre className="overflow-auto text-xs leading-relaxed">
          {JSON.stringify(doc, null, 2)}
        </pre>
      </div>
    </div>
  );
}
