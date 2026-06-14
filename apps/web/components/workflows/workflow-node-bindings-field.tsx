"use client";

import {
  DotsThreeVerticalIcon,
  PlusIcon,
  TableIcon,
} from "@phosphor-icons/react";
import type {
  ActionCatalogEntry,
  NodeCatalogEntry,
  WorkflowNodeBinding,
} from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import { resolveActionsForNodeType } from "@/lib/graph/resolve-node-actions";
import { serializeWorkflowNodeBindings } from "@/lib/workflows/workflow-node-bindings";

export function WorkflowNodeBindingsField({
  nodeBindings,
  onNodeBindingsChange,
  nodeCatalog,
  actionCatalog,
  onAddNodeClick,
  disabled,
}: {
  nodeBindings: WorkflowNodeBinding[];
  onNodeBindingsChange: (bindings: WorkflowNodeBinding[]) => void;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  onAddNodeClick: () => void;
  disabled?: boolean;
}) {

  function updateBinding(
    nodeType: string,
    updater: (binding: WorkflowNodeBinding) => WorkflowNodeBinding,
  ) {
    onNodeBindingsChange(
      nodeBindings.map((binding) =>
        binding.nodeType === nodeType ? updater(binding) : binding,
      ),
    );
  }

  function setActionEnabled(
    nodeType: string,
    actionType: string,
    enabled: boolean,
  ) {
    updateBinding(nodeType, (binding) => {
      const disabledActions = new Set(binding.disabledActions);
      if (enabled) {
        disabledActions.delete(actionType);
      } else {
        disabledActions.add(actionType);
      }
      return {
        ...binding,
        disabledActions: [...disabledActions],
      };
    });
  }

  function removeBinding(nodeType: string) {
    onNodeBindingsChange(
      nodeBindings.filter((binding) => binding.nodeType !== nodeType),
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
          {nodeBindings.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No nodes registered yet.
            </div>
          ) : (
            <ul className="divide-y">
              {nodeBindings.map((binding) => {
                const entry = nodeCatalog.find(
                  (node) => node.nodeType === binding.nodeType,
                );
                const actions = entry
                  ? resolveActionsForNodeType(entry, actionCatalog)
                  : [];

                return (
                  <li
                    key={binding.nodeType}
                    className="flex items-center gap-3 px-3 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                      <TableIcon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {entry?.label ?? binding.nodeType}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {binding.nodeType}
                      </span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 shrink-0"
                            disabled={disabled}
                            data-testid={`edit-workflow-node-${binding.nodeType}`}
                          />
                        }
                      >
                        <DotsThreeVerticalIcon className="size-4" />
                        <span className="sr-only">Edit {binding.nodeType}</span>
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
                              const enabled = !binding.disabledActions.includes(
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
                                    data-testid={`toggle-action-${binding.nodeType}-${action.actionType}`}
                                    onCheckedChange={(checked) =>
                                      setActionEnabled(
                                        binding.nodeType,
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={disabled}
                          onClick={() => removeBinding(binding.nodeType)}
                        >
                          Remove node
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        name="workflowNodeBindings"
        value={serializeWorkflowNodeBindings(nodeBindings)}
      />
    </>
  );
}
