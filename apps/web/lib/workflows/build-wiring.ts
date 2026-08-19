import type { ActionCatalogRow, WorkerIndex } from "@ssota/contracts";

/**
 * Workflows = **배선**(Palantir Automate에 대응) — 실행기가 아니다.
 *
 * 이 화면은 새 저장소를 만들지 않는다. 이미 있는 것들(스케줄·에이전트·워커·액션)이
 * 서로를 어떻게 부르는지를 그린다. 노드 5종:
 *   trigger  스케줄(cron) — 무엇이 실행을 시작하는가
 *   agent    에이전트 정의 — 판단하는 쪽
 *   worker   L3 함수 — 계산하는 쪽 (커밋하지 않는다 [ACTION-03])
 *   action   L2 액션 — 유일한 쓰기 경로 [ACTION-01]
 *   gate     승인이 필요한 액션 앞의 사람 관문
 *
 * 간선의 근거:
 *   schedule.agentDefinitionId  → trigger→agent
 *   action.edits.workerKey      → worker→action (워커가 그 액션의 편집을 계산한다)
 *   action.gate === true        → action 앞에 gate를 끼운다
 *   agent.toolBundles ∋ graph.write → agent→(gate|action) (액션을 부를 수 있는 권한)
 */

export type WiringNodeKind = "trigger" | "agent" | "worker" | "action" | "gate";

export interface WiringNode {
  id: string;
  kind: WiringNodeKind;
  label: string;
  sublabel?: string;
  /** 원본 화면으로 가는 상대 경로 (콘솔 세그먼트) */
  href?: string;
}

export interface WiringEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WiringModel {
  nodes: WiringNode[];
  edges: WiringEdge[];
}

/** 배선에 필요한 만큼의 에이전트 — AgentDefinitionIndex에는 toolBundles가 없어 상세에서 읽는다. */
export interface WiringAgent {
  id: string;
  name: string;
  toolBundles: string[];
}

export interface WiringInput {
  schedules: Array<{ id: string; cronExpression: string; enabled: boolean; agentDefinitionId: string; targetType: string }>;
  agents: WiringAgent[];
  workers: WorkerIndex[];
  actions: ActionCatalogRow[];
}

/** 액션을 부를 수 있는 에이전트인가 — graph.write 번들이 곧 그 권한이다. */
function canWrite(agent: WiringAgent): boolean {
  return agent.toolBundles.includes("graph.write");
}

export function buildWiring(input: WiringInput): WiringModel {
  const nodes: WiringNode[] = [];
  const edges: WiringEdge[] = [];
  const push = (n: WiringNode) => {
    nodes.push(n);
    return n.id;
  };

  const agentIds = new Set(input.agents.map((a) => a.id));

  for (const s of input.schedules) {
    push({
      id: `trigger:${s.id}`,
      kind: "trigger",
      label: s.cronExpression,
      sublabel: s.enabled ? s.targetType : `${s.targetType} (disabled)`,
      href: "schedules",
    });
    if (agentIds.has(s.agentDefinitionId)) {
      edges.push({ id: `e:${s.id}:agent`, source: `trigger:${s.id}`, target: `agent:${s.agentDefinitionId}` });
    }
  }

  for (const a of input.agents) {
    push({
      id: `agent:${a.id}`,
      kind: "agent",
      label: a.name,
      sublabel: canWrite(a) ? "can run actions" : "read only",
      href: `agents/${a.id}`,
    });
  }

  const workerByKey = new Map(input.workers.map((w) => [w.key, w]));
  const usedWorkerKeys = new Set(
    input.actions.flatMap((a) => (a.edits.kind === "function" ? [a.edits.workerKey] : [])),
  );
  for (const w of input.workers) {
    push({
      id: `worker:${w.key}`,
      kind: "worker",
      label: w.name,
      sublabel: usedWorkerKeys.has(w.key) ? "computes edits" : w.kind,
      href: "workers",
    });
  }

  const writers = input.agents.filter(canWrite);

  for (const action of input.actions) {
    const actionId = `action:${action.key}`;
    push({
      id: actionId,
      kind: "action",
      label: action.label,
      sublabel: action.writes.join(", "),
      href: "ontology",
    });

    // 워커 → 액션 (L3가 편집을 계산한다)
    if (action.edits.kind === "function" && workerByKey.has(action.edits.workerKey)) {
      edges.push({
        id: `e:${action.key}:worker`,
        source: `worker:${action.edits.workerKey}`,
        target: actionId,
        label: "computes",
      });
    }

    // 게이트가 있으면 액션 앞에 관문을 끼우고, 호출자는 관문으로 들어간다.
    const entry = action.gate ? `gate:${action.key}` : actionId;
    if (action.gate) {
      push({ id: entry, kind: "gate", label: "Approval", sublabel: action.label, href: "tasks" });
      edges.push({ id: `e:${action.key}:gate`, source: entry, target: actionId, label: "on approve" });
    }

    for (const agent of writers) {
      edges.push({
        id: `e:${agent.id}:${action.key}`,
        source: `agent:${agent.id}`,
        target: entry,
        label: "may run",
      });
    }
  }

  return { nodes, edges };
}
