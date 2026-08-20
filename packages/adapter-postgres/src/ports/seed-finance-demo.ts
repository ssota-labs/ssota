import { runAction, type ActionActor } from "@ssota/core";
import type { Db } from "../db/client.js";
import { createGraphPorts } from "./ontology/create-graph-ports.js";
import { resolveOrganizationIdForTeamspace } from "../teamspace-org-scope.js";
import { FINANCE_DEMO_ACCOUNTS } from "./finance-template.js";

/**
 * Finance 데모 인스턴스 시드 — 계정·회계기간·전표를 **액션으로만** 만든다 [ACTION-01].
 * 시드 스크립트에도 GraphWritePort 예외를 두지 않는다: 시드가 통과한다는 것은
 * 그 도메인의 액션 정의가 실제로 동작한다는 뜻이기도 하다.
 *
 * 멱등성은 액션 층에서 온다 — 모든 호출이 고정 idempotencyKey를 쓰므로 재실행은 replay다.
 * (별도 "이미 있나" 검사를 두지 않는다. 그 검사는 다른 경로로 생긴 데이터에 속기 쉽다.)
 */
const SEED_ACTOR: ActionActor = { id: null, kind: "system", role: null };

export async function seedFinanceDemo(db: Db, teamspaceId: string): Promise<void> {
  const organizationId = await resolveOrganizationIdForTeamspace(db, teamspaceId);
  const ports = createGraphPorts(db, { organizationId, teamspaceId });
  const deps = {
    actions: ports.actions,
    catalog: ports.catalog,
    graphRead: ports.graphRead,
    commit: ports.commit,
  };

  const run = (actionKey: string, parameters: Record<string, unknown>, idempotencyKey: string) =>
    runAction(deps, { teamspaceId, actionKey, parameters, idempotencyKey }, SEED_ACTOR);

  const accountIds = new Map<string, string>();
  for (const account of FINANCE_DEMO_ACCOUNTS) {
    const res = await run("finance.open_account", { ...account }, `seed:account:${account.code}`);
    accountIds.set(account.code, res.result.createdNodeIds[0]!);
  }

  await run("finance.open_period", { code: "2026-08", startsOn: "2026-08-01", endsOn: "2026-08-31" }, "seed:period:2026-08");

  await run(
    "finance.post_journal_entry",
    {
      entryNo: "JE-0001",
      postedAt: "2026-08-03",
      memo: "컨설팅 매출",
      debitAccountId: accountIds.get("1100"),
      creditAccountId: accountIds.get("4000"),
      amount: 3_000_000,
    },
    "seed:entry:JE-0001",
  );
  await run(
    "finance.post_journal_entry",
    {
      entryNo: "JE-0002",
      postedAt: "2026-08-05",
      memo: "수수료 지급",
      debitAccountId: accountIds.get("5000"),
      creditAccountId: accountIds.get("1000"),
      amount: 120_000,
    },
    "seed:entry:JE-0002",
  );
}
