import { EditorLabClient } from "./editor-lab-client";

export const metadata = {
  title: "Editor Lab · SSOTA",
};

export default function EditorLabPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">Editor Lab</h1>
        <p className="text-sm text-muted-foreground">
          Tiptap Notion-like 에디터 Phase 2 — 콜아웃·토글·멘션·이모지·이미지 업로드·워크플로 설명 에디터.
        </p>
      </div>
      <EditorLabClient />
    </main>
  );
}
