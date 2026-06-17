"use client";

import {
  isTiptapDoc,
  plainTextToTiptapDoc,
  SsotaEditor,
  tiptapDocToPlainText,
  type JSONContent,
} from "@ssota/editor";
import "@ssota/editor/styles.css";
import { useMemo, useState } from "react";
import { createSsotaEditorHostProps } from "@/lib/editor/host-props";

export function WorkflowDescriptionEditor({
  projectId,
  agentNotes,
  agentNotesDoc,
}: {
  projectId: string;
  agentNotes: string;
  agentNotesDoc?: unknown;
}) {
  const initialDoc = useMemo<JSONContent>(() => {
    if (isTiptapDoc(agentNotesDoc)) return agentNotesDoc;
    return plainTextToTiptapDoc(agentNotes);
  }, [agentNotes, agentNotesDoc]);

  const [doc, setDoc] = useState<JSONContent>(initialDoc);
  const [plain, setPlain] = useState(() => tiptapDocToPlainText(initialDoc));
  const hostProps = useMemo(
    () => createSsotaEditorHostProps(projectId),
    [projectId],
  );

  return (
    <div data-testid="workflow-description-editor">
      <input type="hidden" name="body" value={plain} />
      <input type="hidden" name="bodyDoc" value={JSON.stringify(doc)} />
      <div className="rounded-md border bg-background px-4 py-3">
        <SsotaEditor
          content={initialDoc}
          onChange={(nextDoc) => {
            setDoc(nextDoc);
            setPlain(tiptapDocToPlainText(nextDoc));
          }}
          placeholder="워크플로 설명을 입력하거나 / 를 눌러 블록을 추가하세요"
          {...hostProps}
        />
      </div>
    </div>
  );
}
