"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { AgentDefinition } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { AgentSettingsSheet } from "@/components/console/agent-settings-sheet";
import { AgentRunLog } from "@/components/console/agent-run-log";
import type { AgentSettingsContext } from "@/lib/console/load-agent-settings-context";
import type { AgentRunRow } from "@/lib/console/agent-run-format";

type AgentDetailWorkspaceProps = {
  teamspaceId: string;
  /** URL 세그먼트: definition uuid 또는 "main". */
  agentRouteId: string;
  definition: AgentDefinition;
  settingsTarget: "main" | "agent";
  activeTab: "settings" | "logs";
  agentsHref: string;
  settingsContext: AgentSettingsContext;
  linkedWorkerIds: string[];
  boundSkillIds: string[];
  workers: AgentDefinition[];
  connectionsHref: string;
  initialRuns: AgentRunRow[];
  initialNextCursor: string | null;
};

/**
 * 에이전트 디테일 페이지 — 설정/로그 탭. 탭 상태는 ?tab= searchParam으로
 * 유지한다 (router.replace — 히스토리 오염 없이 새로고침·공유 가능).
 */
export function AgentDetailWorkspace({
  teamspaceId,
  agentRouteId,
  definition,
  settingsTarget,
  activeTab,
  agentsHref,
  settingsContext,
  linkedWorkerIds,
  boundSkillIds,
  workers,
  connectionsHref,
  initialRuns,
  initialNextCursor,
}: AgentDetailWorkspaceProps) {
  const router = useRouter();
  const requestCloseRef = useRef<((action: () => void) => void) | null>(null);

  const registerRequestClose = useCallback(
    (requestClose: ((action: () => void) => void) | null) => {
      requestCloseRef.current = requestClose;
    },
    [],
  );

  const goBack = useCallback(() => {
    const navigate = () => router.push(agentsHref);
    if (requestCloseRef.current) {
      requestCloseRef.current(navigate);
      return;
    }
    navigate();
  }, [router, agentsHref]);

  const handleTabChange = useCallback(
    (value: string) => {
      const url =
        value === "logs" ? `?tab=logs` : window.location.pathname;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4 px-6 py-6"
      data-testid="agent-detail-workspace"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={goBack}
          aria-label="Back to agents"
          data-testid="agent-detail-back"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{definition.name}</h1>
          {definition.description ? (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {definition.description}
            </p>
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="settings" data-testid="agent-detail-tab-settings">
            설정
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="agent-detail-tab-logs">
            로그
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-4">
          <AgentSettingsSheet
            definition={definition}
            mode="edit"
            presentation="page"
            settingsTarget={settingsTarget}
            teamspaceId={teamspaceId}
            accountId={settingsContext.accountId}
            linkedWorkerIds={linkedWorkerIds}
            boundSkillIds={boundSkillIds}
            skillCatalog={settingsContext.skillCatalog}
            storedWorkers={settingsContext.storedWorkers}
            workers={workers}
            connectors={settingsContext.connectors}
            connections={settingsContext.connections}
            inboundChannels={settingsContext.inboundChannels}
            channelsHref={settingsContext.channelsHref}
            connectionsHref={connectionsHref}
            schedules={settingsContext.schedules}
            onClose={goBack}
            registerRequestClose={registerRequestClose}
          />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <AgentRunLog
            teamspaceId={teamspaceId}
            agentId={agentRouteId}
            initialRuns={initialRuns}
            initialNextCursor={initialNextCursor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
