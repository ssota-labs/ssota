import {
  createGraphGatePolicySource,
  runAction,
  type ActionActor,
  type FunctionEditsPlanner,
  type RunActionResult,
} from "@ssota/core";
import type { RunActionInput } from "@ssota/contracts";
import { getGraphPortsForTeamspace, getWorkerPort } from "../ports.js";
import { createWorkerEditsPlanner } from "../workers/worker-edits-planner.js";
import type { WorkerExecutionScope } from "../workers/worker-sdk-host.js";

/**
 * 액션 실행 스코프 — 콘솔·에이전트 도구·MCP가 같은 진입점으로 runAction을 부른다.
 *
 * L3(function-kind) 액션은 워커를 실행할 **스코프**(SDK host)가 필요하다. 그 스코프는
 * apps/web가 만들 수 있으므로(`buildWorkerExecutionScope`), 앱이 부팅 시
 * `registerWorkerScopeBuilder`로 빌더를 등록한다. 등록이 없으면 스코프 없이 실행하며,
 * 스코프를 요구하는 워커는 executeWorker가 거부한다 → WorkerPlanError로 올라온다.
 */
export interface ActionScope {
  teamspaceId: string;
  accountId?: string;
  organizationId?: string;
}

export type WorkerScopeBuilder = (input: {
  teamspaceId: string;
  accountId?: string | null;
  workerKey: string;
}) => Promise<{ scope: WorkerExecutionScope; release?: () => void | Promise<void> } | null>;

let workerScopeBuilder: WorkerScopeBuilder | null = null;

export function registerWorkerScopeBuilder(builder: WorkerScopeBuilder | null): void {
  workerScopeBuilder = builder;
}

function createScopedPlanner(scope: ActionScope): FunctionEditsPlanner {
  const workers = getWorkerPort(scope.teamspaceId, scope.accountId);
  return {
    async plan(input) {
      const built = workerScopeBuilder
        ? await workerScopeBuilder({
            teamspaceId: scope.teamspaceId,
            accountId: scope.accountId ?? null,
            workerKey: input.workerKey,
          })
        : null;
      try {
        const planner = createWorkerEditsPlanner({
          getWorkerByKey: (key) => workers.getByKey(key),
          scope: built?.scope,
        });
        return await planner.plan(input);
      } finally {
        await built?.release?.();
      }
    },
  };
}

/** runAction 의존성 묶음 — 같은 teamspace 스코프의 catalog·graphRead·commit·actions·gate·planner. */
export async function createRunActionDeps(scope: ActionScope) {
  const ports = await getGraphPortsForTeamspace(scope.teamspaceId, scope.accountId);
  return {
    actions: ports.actions,
    catalog: ports.catalog,
    graphRead: ports.graphRead,
    commit: ports.commit,
    gatePolicies: createGraphGatePolicySource(ports.graphRead),
    planner: createScopedPlanner(scope),
    ports,
  };
}

export async function runActionInScope(
  scope: ActionScope,
  input: Omit<RunActionInput, "teamspaceId">,
  actor: ActionActor,
): Promise<RunActionResult> {
  const deps = await createRunActionDeps(scope);
  return runAction(deps, { ...input, teamspaceId: scope.teamspaceId }, actor);
}
