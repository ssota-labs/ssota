import { registerWorkerScopeBuilder } from "@ssota/agent-runtime";
import { getWorkerPort } from "@/lib/ports";
import { buildWorkerExecutionScope } from "@/lib/workers/build-worker-execution-scope";
import { revokeWorkerExecutionSession } from "@/lib/workers/worker-execution-sessions";

/**
 * function-kind 액션(L3)이 워커를 **스코프 있는 SDK**로 실행하도록 agent-runtime에
 * 스코프 빌더를 등록한다. 워커 실행 스코프(권한·SDK bridge·세션 토큰)는 apps/web만
 * 만들 수 있으므로 여기서 주입한다 — instrumentation과 Workflow step 번들 양쪽에서 부른다.
 */
let registered = false;

export function registerActionWorkerScope(): void {
  if (registered) return;
  registered = true;
  registerWorkerScopeBuilder(async ({ teamspaceId, accountId, workerKey }) => {
    const worker = await getWorkerPort(teamspaceId).getByKey(workerKey);
    if (!worker) return null;
    const { scope, token } = await buildWorkerExecutionScope({ worker, accountId });
    return { scope, release: () => revokeWorkerExecutionSession(token) };
  });
}
