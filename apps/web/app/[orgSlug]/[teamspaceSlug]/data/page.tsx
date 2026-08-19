import { Suspense } from "react";
import { inferParamNodeTypes, type EdgeTypeRef } from "@ssota/contracts";
import { DataWorkspace, type DataRow, type TypeSummary } from "@/components/data/data-workspace";
import type { NodeOption } from "@/components/data/action-form";
import { GraphContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";

/**
 * Data 페이지 — 인스턴스 열람(Supabase Table Editor 결) + 액션 실행.
 * 타입·액션이 런타임 정의라 컬럼·폼이 데이터에서 나온다 → typed React 라우트 [GRAPH-08].
 */
export default function DataPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  return (
    <Suspense fallback={<GraphContentLoading />}>
      <DataPageInner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const ROW_LIMIT = 200;

async function DataPageInner({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ orgSlug, teamspaceSlug }, { type }] = await Promise.all([params, searchParams]);
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const { catalog, graphRead, actions } = await getGraphPorts(project.id);

  const [nodeTypes, edgeTypes, actionRows] = await Promise.all([
    catalog.listNodeCatalog(),
    catalog.listEdgeCatalog(),
    actions.listActionRows(),
  ]);

  // uuid 파라미터가 어떤 객체 타입을 가리키는지는 액션의 편집이 이미 알고 있다 —
  // 엣지 끝점이면 그 링크의 domain/range가 답이다. 폼의 선택기를 그걸로 좁힌다.
  const nodeKeyById = new Map(nodeTypes.map((t) => [t.id, t.key]));
  const edgeRefs: EdgeTypeRef[] = edgeTypes.map((e) => ({
    key: e.key,
    domainKeys: e.domainCatalogIds.map((id) => nodeKeyById.get(id)).filter((k): k is string => !!k),
    rangeKeys: e.rangeCatalogIds.map((id) => nodeKeyById.get(id)).filter((k): k is string => !!k),
  }));
  const nodeKeys = new Set(nodeTypes.map((t) => t.key));
  const paramTypesByAction = Object.fromEntries(
    actionRows.map((a) => [
      a.key,
      inferParamNodeTypes(a, edgeRefs, a.writes.filter((w) => nodeKeys.has(w))),
    ]),
  );

  const activeType = type ? nodeTypes.find((t) => t.key === type) ?? null : nodeTypes[0] ?? null;

  // 타입별 카운트 — explorer의 숫자. 행 수가 커지면 count 쿼리로 바꾼다.
  const summaries: TypeSummary[] = await Promise.all(
    nodeTypes.map(async (t) => ({
      catalogKey: t.key,
      label: t.label,
      count: (await graphRead.queryNodes({ teamspaceId: project.id, catalogKey: t.key, limit: 500 })).length,
    })),
  );

  const nodes = activeType
    ? await graphRead.queryNodes({ teamspaceId: project.id, catalogKey: activeType.key, limit: ROW_LIMIT })
    : [];

  const rows: DataRow[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    catalogKey: n.catalogKey,
    properties: n.properties,
    updatedAt: n.updatedAt.toISOString(),
  }));

  // uuid 파라미터의 선택 후보 — 액션이 쓰는 타입 위주로, 전체는 상한을 둔다.
  const optionTypes = nodeTypes.filter((t) => actionRows.some((a) => a.writes.includes(t.key))).length
    ? nodeTypes
    : nodeTypes.slice(0, 5);
  const nodeOptions: NodeOption[] = (
    await Promise.all(
      optionTypes.map((t) =>
        graphRead.queryNodes({ teamspaceId: project.id, catalogKey: t.key, limit: 100 }),
      ),
    )
  )
    .flat()
    .map((n) => ({ id: n.id, title: n.title, catalogKey: n.catalogKey, catalogLabel: n.catalogLabel }));

  return (
    <DataWorkspace
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      types={nodeTypes}
      summaries={summaries}
      activeType={activeType}
      rows={rows}
      actions={actionRows}
      nodeOptions={nodeOptions}
      paramTypesByAction={paramTypesByAction}
    />
  );
}
