"use client";

import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  FlowArrowIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import type { ContextSpec } from "@ssota/contracts";
import { Label } from "@ssota/ui/components/ui/label";
import { AddContextFilterGroupDialog } from "@/components/workflows/add-context-filter-group-dialog";
import { AddContextAssertionDialog } from "@/components/workflows/add-context-traversal-dialog";
import { ContextAssertionEditDialog } from "@/components/workflows/context-assertion-edit-dialog";
import { ContextFilterGroupEditDialog } from "@/components/workflows/context-filter-group-edit-dialog";
import {
  ContextListRow,
  ContextListSection,
} from "@/components/workflows/context-list-section";
import { ContextTraversalEditDialog } from "@/components/workflows/context-traversal-edit-dialog";
import {
  assertionSummary,
  createAssertionFromKind,
  createFilterGroupFromNodeType,
  createTraversalFromFilterGroup,
  filterGroupSummary,
  serializeWorkflowContext,
  traversalSummary,
  type WorkflowEdgeCatalogOption,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type WorkflowContextFieldProps = {
  context: ContextSpec;
  onContextChange: (context: ContextSpec) => void;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
};

export function WorkflowContextField({
  context,
  onContextChange,
  nodeCatalog,
  edgeCatalog,
}: WorkflowContextFieldProps) {
  const [addFilterGroupOpen, setAddFilterGroupOpen] = useState(false);
  const [addAssertionOpen, setAddAssertionOpen] = useState(false);
  const [editFilterGroupId, setEditFilterGroupId] = useState<string | null>(null);
  const [editTraversalId, setEditTraversalId] = useState<string | null>(null);
  const [editAssertionId, setEditAssertionId] = useState<string | null>(null);

  const filterGroupRefs = useMemo(
    () =>
      context.filterGroups.map((group) => ({
        id: group.id,
        label: group.label ?? group.nodeType,
      })),
    [context.filterGroups],
  );

  const editingFilterGroup =
    context.filterGroups.find((group) => group.id === editFilterGroupId) ?? null;
  const editingTraversal =
    context.traversals.find((traversal) => traversal.id === editTraversalId) ?? null;
  const editingAssertion =
    context.assertions.find((assertion) => assertion.id === editAssertionId) ?? null;

  function patchContext(patch: Partial<ContextSpec>) {
    onContextChange({ ...context, ...patch });
  }

  function updateFilterGroup(next: typeof editingFilterGroup) {
    if (!next) return;
    patchContext({
      filterGroups: context.filterGroups.map((group) =>
        group.id === next.id ? next : group,
      ),
    });
  }

  function updateTraversal(next: typeof editingTraversal) {
    if (!next) return;
    patchContext({
      traversals: context.traversals.map((traversal) =>
        traversal.id === next.id ? next : traversal,
      ),
    });
  }

  function updateAssertion(next: typeof editingAssertion) {
    if (!next) return;
    patchContext({
      assertions: context.assertions.map((assertion) =>
        assertion.id === next.id ? next : assertion,
      ),
    });
  }

  return (
    <>
      <div className="space-y-6 px-6 pb-6">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Context</Label>
          <p className="text-sm text-muted-foreground">
            Filter groups, traversals, and assertions agents use to assemble graph
            context.
          </p>
        </div>

        <ContextListSection
          title="Filter groups"
          description="One node type per group with property conditions."
          addLabel="Add filter group"
          addTestId="add-filter-group"
          hasItems={context.filterGroups.length > 0}
          onAdd={() => setAddFilterGroupOpen(true)}
        >
          {context.filterGroups.map((group) => {
            const summary = filterGroupSummary(group, nodeCatalog);
            return (
              <ContextListRow
                key={group.id}
                icon={FunnelIcon}
                title={summary.title}
                description={summary.description}
                testId={`filter-group-row-${group.id}`}
                removeLabel="Remove filter group"
                onEdit={() => setEditFilterGroupId(group.id)}
                onRemove={() =>
                  patchContext({
                    filterGroups: context.filterGroups.filter(
                      (item) => item.id !== group.id,
                    ),
                  })
                }
              />
            );
          })}
        </ContextListSection>

        <ContextListSection
          title="Traversals"
          description="Hop through edges from a filter group ref."
          addLabel="Add traversal"
          addTestId="add-context-traversal"
          className="border-t border-border pt-6"
          hasItems={context.traversals.length > 0}
          emptyMessage={
            context.filterGroups.length === 0
              ? "Add a filter group first."
              : "None added yet."
          }
          onAdd={() => {
            const firstGroup = context.filterGroups[0];
            if (!firstGroup) return;
            patchContext({
              traversals: [
                ...context.traversals,
                createTraversalFromFilterGroup(firstGroup),
              ],
            });
          }}
        >
          {context.traversals.map((traversal) => {
            const summary = traversalSummary(traversal, filterGroupRefs);
            return (
              <ContextListRow
                key={traversal.id}
                icon={FlowArrowIcon}
                title={summary.title}
                description={summary.description}
                testId={`traversal-row-${traversal.id}`}
                removeLabel="Remove traversal"
                onEdit={() => setEditTraversalId(traversal.id)}
                onRemove={() =>
                  patchContext({
                    traversals: context.traversals.filter(
                      (item) => item.id !== traversal.id,
                    ),
                  })
                }
              />
            );
          })}
        </ContextListSection>

        <ContextListSection
          title="Assertions"
          description="Soft checks agents should evaluate against assembled context."
          addLabel="Add assertion"
          addTestId="add-context-assertion"
          className="border-t border-border pt-6"
          hasItems={context.assertions.length > 0}
          onAdd={() => setAddAssertionOpen(true)}
        >
          {context.assertions.map((assertion) => {
            const summary = assertionSummary(assertion);
            return (
              <ContextListRow
                key={assertion.id}
                icon={CheckCircleIcon}
                title={summary.title}
                description={summary.description}
                testId={`assertion-row-${assertion.id}`}
                removeLabel="Remove assertion"
                onEdit={() => setEditAssertionId(assertion.id)}
                onRemove={() =>
                  patchContext({
                    assertions: context.assertions.filter(
                      (item) => item.id !== assertion.id,
                    ),
                  })
                }
              />
            );
          })}
        </ContextListSection>
      </div>

      <input
        type="hidden"
        name="workflowContext"
        value={serializeWorkflowContext(context)}
      />

      <AddContextFilterGroupDialog
        open={addFilterGroupOpen}
        onOpenChange={setAddFilterGroupOpen}
        nodeCatalog={nodeCatalog}
        existingNodeTypes={context.filterGroups.map((group) => group.nodeType)}
        onAddGroup={(nodeType) =>
          patchContext({
            filterGroups: [
              ...context.filterGroups,
              createFilterGroupFromNodeType(nodeType),
            ],
          })
        }
      />

      <ContextFilterGroupEditDialog
        open={editFilterGroupId !== null}
        onOpenChange={(open) => {
          if (!open) setEditFilterGroupId(null);
        }}
        group={editingFilterGroup}
        nodeCatalog={nodeCatalog}
        onSave={updateFilterGroup}
      />

      <ContextTraversalEditDialog
        open={editTraversalId !== null}
        onOpenChange={(open) => {
          if (!open) setEditTraversalId(null);
        }}
        traversal={editingTraversal}
        filterGroupRefs={filterGroupRefs}
        nodeCatalog={nodeCatalog}
        edgeCatalog={edgeCatalog}
        onSave={updateTraversal}
      />

      <AddContextAssertionDialog
        open={addAssertionOpen}
        onOpenChange={setAddAssertionOpen}
        onAddAssertion={(kind) =>
          patchContext({
            assertions: [...context.assertions, createAssertionFromKind(kind)],
          })
        }
      />

      <ContextAssertionEditDialog
        open={editAssertionId !== null}
        onOpenChange={(open) => {
          if (!open) setEditAssertionId(null);
        }}
        assertion={editingAssertion}
        nodeCatalog={nodeCatalog}
        onSave={updateAssertion}
      />
    </>
  );
}
