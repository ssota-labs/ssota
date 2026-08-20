"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type {
  ActionCatalogRow,
  EdgeCatalogRow,
  NodeCatalogRow,
  WorkerIndex,
} from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  deleteActionTypeAction,
  deleteEdgeTypeAction,
  deleteNodeTypeAction,
  saveActionTypeAction,
  saveEdgeTypeAction,
  saveNodeTypeAction,
} from "@/app/[orgSlug]/[teamspaceSlug]/ontology/actions";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";
import { OntologyExplorer, type ExplorerItem } from "./ontology-explorer";
import { ActionTypeForm, LinkTypeForm, ObjectTypeForm } from "./type-forms";

/**
 * Ontology 워크스페이스 — AIP Ontology Manager 대응. 좌: 촘촘한 explorer,
 * 우: 선택한 정의의 편집 폼. 4섹션 = Objects(L1 node) · Links(L1 edge) · Actions(L2) · Functions(L3 worker, 읽기).
 */

type Selection =
  | { kind: "object"; row: NodeCatalogRow | null }
  | { kind: "link"; row: EdgeCatalogRow | null }
  | { kind: "action"; row: ActionCatalogRow | null }
  | { kind: "function"; row: WorkerIndex }
  | null;

export function OntologyWorkspace({
  orgSlug,
  teamspaceSlug,
  nodeTypes,
  edgeTypes,
  actions,
  workers,
}: {
  orgSlug: string;
  teamspaceSlug: string;
  nodeTypes: NodeCatalogRow[];
  edgeTypes: EdgeCatalogRow[];
  actions: ActionCatalogRow[];
  workers: WorkerIndex[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);

  const refresh = (next: Selection) => {
    setSelection(next);
    router.refresh();
  };

  const sections = [
    {
      id: "object",
      title: "Objects",
      items: nodeTypes.map<ExplorerItem>((n) => ({ id: n.id, key: n.key, label: n.label })),
      onCreate: () => setSelection({ kind: "object", row: null }),
      createLabel: "New object type",
    },
    {
      id: "link",
      title: "Links",
      items: edgeTypes.map<ExplorerItem>((e) => ({ id: e.id, key: e.key, label: e.label })),
      onCreate: () => setSelection({ kind: "link", row: null }),
      createLabel: "New link type",
    },
    {
      id: "action",
      title: "Actions",
      items: actions.map<ExplorerItem>((a) => ({ id: a.id, key: a.key, label: a.label, badge: a.edits.kind === "function" ? "fn" : "decl" })),
      onCreate: () => setSelection({ kind: "action", row: null }),
      createLabel: "New action",
    },
    {
      id: "function",
      title: "Functions",
      items: workers.map<ExplorerItem>((w) => ({ id: w.id, key: w.key, label: w.name, badge: w.kind })),
    },
  ];

  const selectedId =
    selection && selection.kind === "function"
      ? selection.row.id
      : selection?.row?.id ?? null;

  return (
    <div className="flex h-full min-h-0" data-testid="ontology-workspace">
      <OntologyExplorer
        sections={sections}
        selectedId={selectedId}
        onSelect={(sectionId, item) => {
          if (sectionId === "object") setSelection({ kind: "object", row: nodeTypes.find((n) => n.id === item.id) ?? null });
          if (sectionId === "link") setSelection({ kind: "link", row: edgeTypes.find((e) => e.id === item.id) ?? null });
          if (sectionId === "action") setSelection({ kind: "action", row: actions.find((a) => a.id === item.id) ?? null });
          if (sectionId === "function") {
            const w = workers.find((x) => x.id === item.id);
            if (w) setSelection({ kind: "function", row: w });
          }
        }}
      />

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          {selection === null ? (
            <EmptyState
              orgSlug={orgSlug}
              teamspaceSlug={teamspaceSlug}
              counts={{ objects: nodeTypes.length, links: edgeTypes.length, actions: actions.length, functions: workers.length }}
              onCreateObject={() => setSelection({ kind: "object", row: null })}
            />
          ) : null}

          {selection?.kind === "object" ? (
            <Panel title={selection.row ? selection.row.label : "New object type"} subtitle="Object type — what a record of this kind looks like (L1).">
              <ObjectTypeForm
                key={selection.row?.id ?? "new"}
                initial={selection.row}
                onSave={(input) => saveNodeTypeAction(orgSlug, teamspaceSlug, input)}
                onDelete={(id) => deleteNodeTypeAction(orgSlug, teamspaceSlug, id)}
                onSaved={(row) => refresh(row ? { kind: "object", row } : null)}
              />
            </Panel>
          ) : null}

          {selection?.kind === "link" ? (
            <Panel title={selection.row ? selection.row.label : "New link type"} subtitle="Link type — a relationship, constrained by domain/range object types (L1).">
              <LinkTypeForm
                key={selection.row?.id ?? "new"}
                initial={selection.row}
                nodeTypes={nodeTypes}
                onSave={(input) => saveEdgeTypeAction(orgSlug, teamspaceSlug, input)}
                onDelete={(id) => deleteEdgeTypeAction(orgSlug, teamspaceSlug, id)}
                onSaved={(row) => refresh(row ? { kind: "link", row } : null)}
              />
            </Panel>
          ) : null}

          {selection?.kind === "action" ? (
            <Panel title={selection.row ? selection.row.label : "New action"} subtitle="Action — the only way data is written: parameters → edits → one transaction → audit (L2).">
              <ActionTypeForm
                key={selection.row?.id ?? "new"}
                initial={selection.row}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                workers={workers}
                onSave={(input) => saveActionTypeAction(orgSlug, teamspaceSlug, input)}
                onDelete={(key) => deleteActionTypeAction(orgSlug, teamspaceSlug, key)}
                onSaved={(row) => refresh(row ? { kind: "action", row } : null)}
              />
            </Panel>
          ) : null}

          {selection?.kind === "function" ? (
            <Panel title={selection.row.name} subtitle="Function — code that computes edits for an action; it never commits (L3).">
              <dl className="space-y-2 text-sm">
                <Row label="Key"><code className="text-xs">{selection.row.key}</code></Row>
                <Row label="Kind"><Badge variant="secondary">{selection.row.kind}</Badge></Row>
                <Row label="Version">{selection.row.version}</Row>
                {selection.row.description ? <Row label="About">{selection.row.description}</Row> : null}
              </dl>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "workers")} />}
              >
                Edit in Workers
              </Button>
            </Panel>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function EmptyState({
  orgSlug,
  teamspaceSlug,
  counts,
  onCreateObject,
}: {
  orgSlug: string;
  teamspaceSlug: string;
  counts: { objects: number; links: number; actions: number; functions: number };
  onCreateObject: () => void;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Ontology</h1>
        <p className="text-sm text-muted-foreground">
          Define what exists (objects), how things relate (links), and how data may change (actions).
          Functions are the code behind function-backed actions.
        </p>
      </header>
      <dl className="grid grid-cols-4 gap-3">
        {[
          ["Objects", counts.objects],
          ["Links", counts.links],
          ["Actions", counts.actions],
          ["Functions", counts.functions],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <Button size="sm" onClick={onCreateObject}>New object type</Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "data")} />}
        >
          Browse data
        </Button>
      </div>
    </div>
  );
}
