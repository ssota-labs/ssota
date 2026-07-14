"use client";

import { useEffect, useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import {
  RunTranscript,
  type RunTranscriptMessage,
} from "@/components/console/run-transcript";
import {
  TRIGGER_BADGE_LABELS,
  runDurationLabel,
  runStatusBadgeVariant,
  runTokensLabel,
  type AgentRunRow,
} from "@/lib/console/agent-run-format";

type RunDetailSheetProps = {
  teamspaceId: string;
  run: AgentRunRow | null;
  onClose: () => void;
};

/**
 * 런 1건의 실행 상세 — 텔레메트리 요약 + 툴콜/메시지 트랜스크립트.
 * 에이전트 디테일 페이지 로그 탭과 Task 시트가 공유한다.
 */
export function RunDetailSheet({ teamspaceId, run, onClose }: RunDetailSheetProps) {
  const [messages, setMessages] = useState<RunTranscriptMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!run) {
      setMessages(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setMessages(null);
    setError(null);
    fetch(
      `/api/agent-runs/${run.id}?teamspaceId=${encodeURIComponent(teamspaceId)}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load run (${res.status})`);
        return res.json() as Promise<{ messages: RunTranscriptMessage[] }>;
      })
      .then((data) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [run, teamspaceId]);

  return (
    <Sheet open={run !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="overflow-y-auto sm:max-w-xl"
        data-testid="run-detail-sheet"
      >
        {run ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                <span>Run</span>
                <Badge variant={runStatusBadgeVariant(run.status)}>
                  {run.status}
                </Badge>
                {run.trigger ? (
                  <Badge variant="outline">
                    {TRIGGER_BADGE_LABELS[run.trigger] ?? run.trigger}
                  </Badge>
                ) : null}
              </SheetTitle>
              <SheetDescription>
                {new Date(run.startedAt).toLocaleString()} ·{" "}
                {runDurationLabel(run) ?? "실행 중"}
                {run.model ? ` · ${run.model}` : ""}
                {runTokensLabel(run) ? ` · ${runTokensLabel(run)}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : messages === null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> 트랜스크립트 불러오는 중…
                </div>
              ) : (
                <RunTranscript messages={messages} />
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
