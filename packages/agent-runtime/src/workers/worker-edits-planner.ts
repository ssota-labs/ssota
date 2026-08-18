import type { Worker } from "@ssota/contracts";
import { parseGraphEdits, type GraphEdits } from "@ssota/contracts/graph";
import type { FunctionEditsPlanner } from "@ssota/core";
import { executeWorker } from "./execute-worker.js";
import type { WorkerExecutionScope } from "./worker-sdk-host.js";

/**
 * FunctionEditsPlanner 어댑터 — L3 워커를 실행해 GraphEdits를 얻는다 (B 모델).
 *
 * - 워커는 트랜잭션 **밖**(락 전)에서 돈다. `runAction`이 이 결과를 받아 락을 잡고,
 *   워커가 반환한 assert* 가드를 먼저 재평가한 뒤 편집을 적용한다.
 * - 워커는 커밋하지 않는다 [ACTION-03] — SDK에 graph.write가 없다. `{ edits: [...] }`를 반환할 뿐.
 * - 반환값은 여기서 GraphEdits 스키마로 파싱한다 — 워커가 어휘 밖을 내면 여기서 거부.
 *   (writes 선언·catalog 검증·domain/range는 runAction이 트랜잭션 안에서 다시 한다.)
 */
export interface WorkerEditsPlannerDeps {
  getWorkerByKey(key: string): Promise<Worker | null>;
  scope: WorkerExecutionScope;
  timeoutMs?: number;
}

export class WorkerPlanError extends Error {
  constructor(
    message: string,
    public readonly workerKey: string,
  ) {
    super(message);
    this.name = "WorkerPlanError";
  }
}

export function createWorkerEditsPlanner(deps: WorkerEditsPlannerDeps): FunctionEditsPlanner {
  return {
    async plan({ workerKey, parameters }): Promise<GraphEdits> {
      const worker = await deps.getWorkerByKey(workerKey);
      if (!worker) throw new WorkerPlanError(`worker '${workerKey}' not found`, workerKey);

      const run = await executeWorker({
        worker,
        input: parameters,
        trigger: "manual",
        scope: deps.scope,
        timeoutMs: deps.timeoutMs,
      });
      if (!run.ok) {
        // 워커의 throw = 업무 불변식 위반 (예: 시산표 불일치). 메시지를 그대로 올린다.
        throw new WorkerPlanError(run.error ?? "worker failed", workerKey);
      }

      const output = run.output;
      const edits =
        output && typeof output === "object" && "edits" in output
          ? (output as { edits: unknown }).edits
          : output;
      try {
        return parseGraphEdits({ edits });
      } catch (err) {
        throw new WorkerPlanError(
          `worker '${workerKey}' returned edits outside the closed vocabulary: ${
            err instanceof Error ? err.message : String(err)
          }`,
          workerKey,
        );
      }
    },
  };
}
