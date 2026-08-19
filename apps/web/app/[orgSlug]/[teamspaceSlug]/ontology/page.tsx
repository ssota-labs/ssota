import { Suspense } from "react";
import { OntologyWorkspace } from "@/components/ontology/ontology-workspace";
import { GraphContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getGraphPorts, getWorkerPort } from "@/lib/ports";

/**
 * Ontology 페이지 — L1 타입(objects·links) + L2 액션 + L3 함수(읽기)를 한 화면에서 정의한다.
 * 정의 편집은 런타임 스키마 기반 폼이므로 typed React 라우트다 (routes.json 등록, [GRAPH-08]).
 */
export default function OntologyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<GraphContentLoading />}>
      <OntologyPageInner params={params} />
    </Suspense>
  );
}

async function OntologyPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const { catalog, actions } = await getGraphPorts(project.id);

  const [nodeTypes, edgeTypes, actionRows, workers] = await Promise.all([
    catalog.listNodeCatalog(),
    catalog.listEdgeCatalog(),
    actions.listActionRows(),
    getWorkerPort(project.id).listWorkers(),
  ]);

  return (
    <OntologyWorkspace
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      actions={actionRows}
      workers={workers}
    />
  );
}
