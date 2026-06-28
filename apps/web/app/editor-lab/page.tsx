import { EditorLabClient } from "./editor-lab-client";
import { resolveDefaultProjectId } from "@/lib/ports";

export const metadata = {
  title: "Editor Lab · SSOTA",
};

export default async function EditorLabPage() {
  let teamspaceId: string | null = null;
  try {
    teamspaceId = await resolveDefaultProjectId();
  } catch {
    teamspaceId = null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">Editor Lab</h1>
        <p className="text-sm text-muted-foreground">
          Tiptap Notion-like 에디터 Phase 2 — 콜아웃·토글·멘션·이모지·이미지 업로드·슬래시·버블·드래그 핸들.
        </p>
        {!teamspaceId ? (
          <p className="text-sm text-amber-600">
            멘션·이미지 업로드는 시드된 프로젝트가 필요합니다. `pnpm db:seed` 후 새로고침하세요.
          </p>
        ) : null}
      </div>
      <EditorLabClient teamspaceId={teamspaceId} />
    </main>
  );
}
