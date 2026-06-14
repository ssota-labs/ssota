"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import type { ContextSpec } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { AddContextFilterGroupDialog } from "@/components/workflows/add-context-filter-group-dialog";
import {
  AddContextAssertionDialog,
  AddContextTraversalDialog,
} from "@/components/workflows/add-context-traversal-dialog";
import { ContextAssertionList } from "@/components/workflows/context-assertion-list";
import { ContextFilterGroupCard } from "@/components/workflows/context-filter-group-card";
import { ContextTraversalList } from "@/components/workflows/context-traversal-list";
import {
  createAssertionFromKind,
  createFilterGroupFromNodeType,
  createTraversalFromFilterGroup,
  serializeWorkflowContext,
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
  const [addTraversalOpen, setAddTraversalOpen] = useState(false);
  const [addAssertionOpen, setAddAssertionOpen] = useState(false);

  const filterGroupRefs = useMemo(
    () =>
      context.filterGroups.map((group) => ({
        id: group.id,
        label: group.label ?? group.nodeType,
      })),
    [context.filterGroups],
  );

  function patchContext(patch: Partial<ContextSpec>) {
    onContextChange({ ...context, ...patch });
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

        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Filter groups</p>
            <p className="text-xs text-muted-foreground">
              One node type per group with property conditions.
            </p>
          </div>

          <div className="space-y-3">
            {context.filterGroups.map((group) => (
              <ContextFilterGroupCard
                key={group.id}
                group={group}
                nodeCatalog={nodeCatalog}
                onChange={(next) =>
                  patchContext({
                    filterGroups: context.filterGroups.map((item) =>
                      item.id === group.id ? next : item,
                    ),
                  })
                }
                onRemove={() =>
                  patchContext({
                    filterGroups: context.filterGroups.filter(
                      (item) => item.id !== group.id,
                    ),
                  })
                }
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            data-testid="add-filter-group"
            onClick={() => setAddFilterGroupOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            Add filter group
          </Button>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Traversals</p>
            <p className="text-xs text-muted-foreground">
              Hop through edges from a filter group ref.
            </p>
          </div>

          <ContextTraversalList
            traversals={context.traversals}
            filterGroupRefs={filterGroupRefs}
            nodeCatalog={nodeCatalog}
            edgeCatalog={edgeCatalog}
            onChange={(traversals) => patchContext({ traversals })}
            onAddTraversal={() => setAddTraversalOpen(true)}
          />
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Assertions</p>
            <p className="text-xs text-muted-foreground">
              Soft checks agents should evaluate against assembled context.
            </p>
          </div>

          <ContextAssertionList
            assertions={context.assertions}
            nodeCatalog={nodeCatalog}
            onChange={(assertions) => patchContext({ assertions })}
            onAddAssertion={() => setAddAssertionOpen(true)}
          />
        </section>
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

      <AddContextTraversalDialog
        open={addTraversalOpen}
        onOpenChange={setAddTraversalOpen}
        hasFilterGroups={context.filterGroups.length > 0}
        onConfirm={() => {
          const firstGroup = context.filterGroups[0];
          if (!firstGroup) return;
          patchContext({
            traversals: [
              ...context.traversals,
              createTraversalFromFilterGroup(firstGroup),
            ],
          });
          setAddTraversalOpen(false);
        }}
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
    </>
  );
}
