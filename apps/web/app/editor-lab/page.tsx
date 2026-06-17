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
          Tiptap Notion-like 에디터 스파이크 (Phase 0). SSR·기본 블록·JSON 영속화 검증용.
        </p>
      </div>
      <EditorLabClient />
    </main>
  );
}
