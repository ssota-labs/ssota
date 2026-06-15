"use client";

import {
  PencilSimpleIcon,
  PlusIcon,
  TableIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type {
  ActionCatalogEntry,
  NodeCatalogEntry,
  WorkflowApplicableNodeType,
} from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import { resolveActionsForNodeType } from "@/lib/graph/resolve-node-actions";
import { serializeApplicableNodeTypes } from "@/lib/workflows/workflow-applicable-node-types";

export function WorkflowApplicableNodeTypesField({
  applicableNodeTypes,
  onApplicableNodeTypesChange,
  nodeCatalog,
  actionCatalog,
  onAddNodeClick,
  disabled,
}: {
  applicableNodeTypes: WorkflowApplicableNodeType[];
  onApplicableNodeTypesChange: (entries: WorkflowApplicableNodeType[]) => void;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  onAddNodeClick: () => void;
  disabled?: boolean;
}) {
  function updateEntry(
    nodeType: string,
    updater: (entry: WorkflowApplicableNodeType) => WorkflowApplicableNodeType,
  ) {
    onApplicableNodeTypesChange(
      applicableNodeTypes.map((entry) =>
        entry.nodeType === nodeType ? updater(entry) : entry,
      ),
    );
  }

  function setActionEnabled(
    nodeType: string,
    actionType: string,
    enabled: boolean,
  ) {
    updateEntry(nodeType, (entry) => {
      const disabledActions = new Set(entry.disabledActions);
      if (enabled) {
        disabledActions.delete(actionType);
      } else {
        disabledActions.add(actionType);
      }
      return {
        ...entry,
        disabledActions: [...disabledActions],
      };
    });
  }

  function removeEntry(nodeType: string) {
    onApplicableNodeTypesChange(
      applicableNodeTypes.filter((entry) => entry.nodeType !== nodeType),
    );
  }

  return (
    <>
      <div className="space-y-3 px-6">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Applicable nodes</Label>
          <p className="text-xs text-muted-foreground">
            Register node catalog types used in this workflow. Toggle associated
            actions per node.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          {applicableNodeTypes.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No nodes registered yet.
            </div>
          ) : (
            <ul className="divide-y">
              {applicableNodeTypes.map((entry) => {
                const catalogEntry = nodeCatalog.find(
                  (node) => node.nodeType === entry.nodeType,
                );
                const actions = catalogEntry
                  ? resolveActionsForNodeType(catalogEntry, actionCatalog)
                  : [];

                return (
                  <li
                    key={entry.nodeType}
                    className="flex items-center gap-3 px-3 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                      <TableIcon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {catalogEntry?.label ?? entry.nodeType}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {entry.nodeType}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 shrink-0"
                              disabled={disabled}
                              data-testid={`edit-workflow-node-${entry.nodeType}`}
                            />
                          }
                        >
                          <PencilSimpleIcon className="size-4" />
                          <span className="sr-only">
                            Edit actions for {entry.nodeType}
                          </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {actions.length === 0 ? (
                              <DropdownMenuItem disabled>
                                No associated actions
                              </DropdownMenuItem>
                            ) : (
                              actions.map((action) => {
                                const enabled = !entry.disabledActions.includes(
                                  action.actionType,
                                );
                                return (
                                  <DropdownMenuItem
                                    key={action.actionType}
                                    className="flex items-center justify-between gap-3"
                                    onSelect={(event) => event.preventDefault()}
                                  >
                                    <span className="min-w-0 truncate text-sm">
                                      {action.label || action.actionType}
                                    </span>
                                    <Switch
                                      checked={enabled}
                                      disabled={disabled}
                                      aria-label={`${action.actionType} enabled`}
                                      data-testid={`toggle-action-${entry.nodeType}-${action.actionType}`}
                                      onCheckedChange={(checked) =>
                                        setActionEnabled(
                                          entry.nodeType,
                                          action.actionType,
                                          checked,
                                        )
                                      }
                                    />
                                  </DropdownMenuItem>
                                );
                              })
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                        disabled={disabled}
                        data-testid={`delete-workflow-node-${entry.nodeType}`}
                        onClick={() => removeEntry(entry.nodeType)}
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">
                          Remove {entry.nodeType}
                        </span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              disabled={disabled}
              data-testid="add-workflow-node"
              onClick={onAddNodeClick}
            >
              <PlusIcon className="size-3.5" />
              Add node
            </Button>
          </div>
        </div>
      </div>

      <input
        type="hidden"
        name="applicableNodeTypes"
        value={serializeApplicableNodeTypes(applicableNodeTypes)}
      />
    </>
  );
}

/** @deprecated Use WorkflowApplicableNodeTypesField */
export const WorkflowNodeBindingsField = WorkflowApplicableNodeTypesField;
