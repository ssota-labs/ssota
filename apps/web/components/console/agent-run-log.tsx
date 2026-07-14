"use client";

import { useCallback, useState } from "react";
import type { AgentTrigger } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { RunDetailSheet } from "@/components/console/run-detail-sheet";
import {
  TRIGGER_BADGE_LABELS,
  runDurationLabel,
  runStatusBadgeVariant,
  runTokensLabel,
  type AgentRunRow,
} from "@/lib/console/agent-run-format";

type AgentRunLogProps = {
  teamspaceId: string;
  /** definition uuid 또는 리터럴 "main". */
  agentId: string;
  initialRuns: AgentRunRow[];
  initialNextCursor: string | null;
};

const ALL_TRIGGERS = "all";

async function fetchRuns(params: {
  teamspaceId: string;
  agentId: string;
  trigger?: AgentTrigger;
  cursor?: string;
}): Promise<{ runs: AgentRunRow[]; nextCursor: string | null }> {
  const search = new URLSearchParams({
    teamspaceId: params.teamspaceId,
    agentId: params.agentId,
  });
  if (params.trigger) search.set("trigger", params.trigger);
  if (params.cursor) search.set("cursor", params.cursor);
  const res = await fetch(`/api/agent-runs?${search.toString()}`);
  if (!res.ok) throw new Error(`Failed to load runs (${res.status})`);
  return res.json();
}

/**
 * 에이전트 디테일 페이지 로그 탭 — 실행 로그 테이블. 행 클릭 시
 * RunDetailSheet(툴콜 + 메시지 트랜스크립트)를 연다.
 */
export function AgentRunLog({
  teamspaceId,
  agentId,
  initialRuns,
  initialNextCursor,
}: AgentRunLogProps) {
  const [runs, setRuns] = useState(initialRuns);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [triggerFilter, setTriggerFilter] = useState<string>(ALL_TRIGGERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRunRow | null>(null);

  const applyFilter = useCallback(
    (value: string | null) => {
      const nextFilter = value ?? ALL_TRIGGERS;
      setTriggerFilter(nextFilter);
      setLoading(true);
      setError(null);
      fetchRuns({
        teamspaceId,
        agentId,
        trigger:
          nextFilter === ALL_TRIGGERS ? undefined : (nextFilter as AgentTrigger),
      })
        .then((data) => {
          setRuns(data.runs);
          setNextCursor(data.nextCursor);
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : String(err)),
        )
        .finally(() => setLoading(false));
    },
    [teamspaceId, agentId],
  );

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    setLoading(true);
    setError(null);
    fetchRuns({
      teamspaceId,
      agentId,
      trigger:
        triggerFilter === ALL_TRIGGERS
          ? undefined
          : (triggerFilter as AgentTrigger),
      cursor: nextCursor,
    })
      .then((data) => {
        setRuns((prev) => [...prev, ...data.runs]);
        setNextCursor(data.nextCursor);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [teamspaceId, agentId, triggerFilter, nextCursor]);

  return (
    <div className="space-y-3" data-testid="agent-run-log">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          트리거·스케줄·태스크·채팅 실행 이력. 행을 클릭하면 툴콜과 에이전트
          메시지를 볼 수 있습니다.
        </p>
        <Select value={triggerFilter} onValueChange={applyFilter}>
          <SelectTrigger
            className="w-36 shrink-0"
            data-testid="agent-run-log-trigger-filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TRIGGERS}>All triggers</SelectItem>
            {Object.entries(TRIGGER_BADGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {runs.length === 0 && !loading ? (
        <div
          className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
          data-testid="agent-run-log-empty"
        >
          아직 실행 로그가 없습니다. 이 에이전트가 트리거·스케줄·태스크로
          실행되면 여기에 기록됩니다.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setActiveRun(run)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/30"
              data-testid={`agent-run-row-${run.id}`}
            >
              <Badge
                variant={runStatusBadgeVariant(run.status)}
                className="w-20 justify-center"
              >
                {run.status}
              </Badge>
              <Badge variant="outline" className="w-24 justify-center">
                {run.trigger
                  ? (TRIGGER_BADGE_LABELS[run.trigger] ?? run.trigger)
                  : run.runtimeKind}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {new Date(run.startedAt).toLocaleString()}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {runDurationLabel(run) ?? "실행 중"}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                {runTokensLabel(run) ?? ""}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {nextCursor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
            data-testid="agent-run-log-load-more"
          >
            더 보기
          </Button>
        ) : null}
        {loading ? <Spinner className="size-4" /> : null}
      </div>

      <RunDetailSheet
        teamspaceId={teamspaceId}
        run={activeRun}
        onClose={() => setActiveRun(null)}
      />
    </div>
  );
}
