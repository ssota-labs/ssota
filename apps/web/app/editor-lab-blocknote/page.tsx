import Link from "next/link";
import { EditorLabBlockNoteClient } from "./editor-lab-blocknote-client";
import { resolveDefaultProjectId } from "@/lib/ports";

export const metadata = {
  title: "Editor Lab (BlockNote) · SSOTA",
};

export default async function EditorLabBlockNotePage() {
  let teamspaceId: string | null = null;
  try {
    teamspaceId = await resolveDefaultProjectId();
  } catch {
    teamspaceId = null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">Editor Lab — BlockNote PoC</h1>
        <p className="text-sm text-muted-foreground">
          BlockNote(shadcn + ko) 기반 Notion-like 에디터 비교 스파이크. 기존 Tiptap{" "}
          <Link href="/editor-lab" className="underline underline-offset-2">
            /editor-lab
          </Link>
          와 나란히 검증합니다.
        </p>
        {!teamspaceId ? (
          <p className="text-sm text-amber-600">
            이미지 업로드는 시드된 프로젝트가 필요합니다. `pnpm db:seed` 후 새로고침하세요.
          </p>
        ) : null}
      </div>
      <EditorLabBlockNoteClient teamspaceId={teamspaceId} />
    </main>
  );
}
