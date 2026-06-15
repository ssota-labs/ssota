"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  FlowArrowIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import type { ContextSpec } from "@ssota/contracts";
import { Label } from "@ssota/ui/components/ui/label";
import { cn } from "@ssota/ui/lib/utils";
import {
  ExpandableListItem,
  ExpandableListSection,
} from "@ssota/ui/components/ui/expandable-list-section";
import { ContextAssertionForm } from "@/components/workflows/context-assertion-form";
import { ContextFilterGroupForm } from "@/components/workflows/context-filter-group-form";
import { ContextTraversalForm } from "@/components/workflows/context-traversal-form";
import {
  assertionSummary,
  createAssertionDraft,
  createFilterGroupDraft,
  createTraversalDraft,
  filterGroupSummary,
  serializeWorkflowContext,
  traversalSummary,
  type WorkflowEdgeCatalogOption,
  type WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

type WorkflowContextFieldProps = {
  context: ContextSpec;
  onContextChange?: (context: ContextSpec) => void;
  nodeCatalog: WorkflowNodeCatalogOption[];
  edgeCatalog: WorkflowEdgeCatalogOption[];
  readOnly?: boolean;
  className?: string;
};

function defaultNodeType(catalog: WorkflowNodeCatalogOption[]): string {
  return catalog[0]?.nodeType ?? "Node";
}

export function WorkflowContextField({
  context,
  onContextChange,
  nodeCatalog,
  edgeCatalog,
  readOnly = false,
  className,
}: WorkflowContextFieldProps) {
  const [expandedFilterGroupId, setExpandedFilterGroupId] = useState<string | null>(
    null,
  );
  const [expandedTraversalId, setExpandedTraversalId] = useState<string | null>(null);
  const [expandedAssertionId, setExpandedAssertionId] = useState<string | null>(null);

  function patchContext(patch: Partial<ContextSpec>) {
    if (readOnly || !onContextChange) return;
    onContextChange({ ...context, ...patch });
  }

  function updateFilterGroup(next: ContextSpec["filterGroups"][number]) {
    patchContext({
      filterGroups: context.filterGroups.map((group) =>
        group.id === next.id ? next : group,
      ),
    });
  }

  function updateTraversal(next: ContextSpec["traversals"][number]) {
    patchContext({
      traversals: context.traversals.map((traversal) =>
        traversal.id === next.id ? next : traversal,
      ),
    });
  }

  function updateAssertion(next: ContextSpec["assertions"][number]) {
    patchContext({
      assertions: context.assertions.map((assertion) =>
        assertion.id === next.id ? next : assertion,
      ),
    });
  }

  function addFilterGroup() {
    const group = createFilterGroupDraft(defaultNodeType(nodeCatalog));
    patchContext({ filterGroups: [...context.filterGroups, group] });
    setExpandedFilterGroupId(group.id);
    setExpandedTraversalId(null);
    setExpandedAssertionId(null);
  }

  function addTraversal() {
    const traversal = createTraversalDraft(defaultNodeType(nodeCatalog));
    patchContext({ traversals: [...context.traversals, traversal] });
    setExpandedTraversalId(traversal.id);
    setExpandedFilterGroupId(null);
    setExpandedAssertionId(null);
  }

  function addAssertion() {
    const assertion = createAssertionDraft(defaultNodeType(nodeCatalog));
    patchContext({ assertions: [...context.assertions, assertion] });
    setExpandedAssertionId(assertion.id);
    setExpandedFilterGroupId(null);
    setExpandedTraversalId(null);
  }

  return (
    <>
      <div className={cn("space-y-6 px-6 pb-6", className)}>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Context</Label>
          <p className="text-sm text-muted-foreground">
            Filter groups, traversals, and assertions agents use to assemble graph
            context.
          </p>
        </div>

        <ExpandableListSection
          title="Filter groups"
          description="One node type per group with property conditions."
          addLabel="Add filter group"
          addTestId="add-filter-group"
          hasItems={context.filterGroups.length > 0}
          onAdd={readOnly ? undefined : addFilterGroup}
        >
          {context.filterGroups.map((group) => {
            const summary = filterGroupSummary(group, nodeCatalog);
            const expanded = expandedFilterGroupId === group.id;
            return (
              <ExpandableListItem
                key={group.id}
                icon={FunnelIcon}
                title={summary.title}
                description={summary.description}
                testId={`filter-group-row-${group.id}`}
                expandedTestId={`filter-group-expanded-${group.id}`}
                expanded={expanded}
                onExpandedChange={(next) =>
                  setExpandedFilterGroupId(next ? group.id : null)
                }
                removeLabel="Remove filter group"
                onRemove={
                  readOnly
                    ? undefined
                    : () => {
                        patchContext({
                          filterGroups: context.filterGroups.filter(
                            (item) => item.id !== group.id,
                          ),
                        });
                        if (expandedFilterGroupId === group.id) {
                          setExpandedFilterGroupId(null);
                        }
                      }
                }
              >
                <fieldset disabled={readOnly} className="min-w-0 border-0 p-0">
                  <ContextFilterGroupForm
                    group={group}
                    nodeCatalog={nodeCatalog}
                    onChange={updateFilterGroup}
                  />
                </fieldset>
              </ExpandableListItem>
            );
          })}
        </ExpandableListSection>

        <ExpandableListSection
          title="Traversals"
          description="Hop through edges from a node type anchor."
          addLabel="Add traversal"
          addTestId="add-context-traversal"
          hasItems={context.traversals.length > 0}
          onAdd={readOnly ? undefined : addTraversal}
        >
          {context.traversals.map((traversal) => {
            const summary = traversalSummary(traversal, nodeCatalog);
            const expanded = expandedTraversalId === traversal.id;
            return (
              <ExpandableListItem
                key={traversal.id}
                icon={FlowArrowIcon}
                title={summary.title}
                description={summary.description}
                testId={`traversal-row-${traversal.id}`}
                expandedTestId={`traversal-expanded-${traversal.id}`}
                expanded={expanded}
                onExpandedChange={(next) =>
                  setExpandedTraversalId(next ? traversal.id : null)
                }
                removeLabel="Remove traversal"
                onRemove={
                  readOnly
                    ? undefined
                    : () => {
                        patchContext({
                          traversals: context.traversals.filter(
                            (item) => item.id !== traversal.id,
                          ),
                        });
                        if (expandedTraversalId === traversal.id) {
                          setExpandedTraversalId(null);
                        }
                      }
                }
              >
                <fieldset disabled={readOnly} className="min-w-0 border-0 p-0">
                  <ContextTraversalForm
                    traversal={traversal}
                    nodeCatalog={nodeCatalog}
                    edgeCatalog={edgeCatalog}
                    onChange={updateTraversal}
                  />
                </fieldset>
              </ExpandableListItem>
            );
          })}
        </ExpandableListSection>

        <ExpandableListSection
          title="Assertions"
          description="Soft checks on node types with property conditions."
          addLabel="Add assertion"
          addTestId="add-context-assertion"
          hasItems={context.assertions.length > 0}
          onAdd={readOnly ? undefined : addAssertion}
        >
          {context.assertions.map((assertion) => {
            const summary = assertionSummary(assertion, nodeCatalog);
            const expanded = expandedAssertionId === assertion.id;
            return (
              <ExpandableListItem
                key={assertion.id}
                icon={CheckCircleIcon}
                title={summary.title}
                description={summary.description}
                testId={`assertion-row-${assertion.id}`}
                expandedTestId={`assertion-expanded-${assertion.id}`}
                expanded={expanded}
                onExpandedChange={(next) =>
                  setExpandedAssertionId(next ? assertion.id : null)
                }
                removeLabel="Remove assertion"
                onRemove={
                  readOnly
                    ? undefined
                    : () => {
                        patchContext({
                          assertions: context.assertions.filter(
                            (item) => item.id !== assertion.id,
                          ),
                        });
                        if (expandedAssertionId === assertion.id) {
                          setExpandedAssertionId(null);
                        }
                      }
                }
              >
                <fieldset disabled={readOnly} className="min-w-0 border-0 p-0">
                  <ContextAssertionForm
                    assertion={assertion}
                    nodeCatalog={nodeCatalog}
                    onChange={updateAssertion}
                  />
                </fieldset>
              </ExpandableListItem>
            );
          })}
        </ExpandableListSection>
      </div>

      {!readOnly ? (
        <input
          type="hidden"
          name="workflowContext"
          value={serializeWorkflowContext(context)}
        />
      ) : null}
    </>
  );
}
