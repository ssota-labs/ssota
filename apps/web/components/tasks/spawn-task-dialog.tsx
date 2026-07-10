"use client";

import { useState, useTransition } from "react";
import { SWDL_AGENT_IDS } from "@ssota/contracts/agents";
import { spawnTaskAction } from "@/app/actions";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";

export type AgentOption = {
  agentDefinitionId: string;
  title: string;
};

/** @deprecated Use AgentOption */
export type WorkflowOption = AgentOption;

type SpawnTaskDialogProps = {
  teamspaceId: string;
  agentOptions: AgentOption[];
};

export function SpawnTaskDialog({
  teamspaceId,
  agentOptions,
}: SpawnTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [agentDefinitionId, setAgentDefinitionId] = useState(
    agentOptions[0]?.agentDefinitionId ?? SWDL_AGENT_IDS.delivery,
  );
  const [assignee, setAssignee] = useState("");
  const [executorType, setExecutorType] = useState<"Agent" | "Human" | "System">(
    "Human",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setAssignee("");
    setExecutorType("Human");
    setAgentDefinitionId(
      agentOptions[0]?.agentDefinitionId ?? SWDL_AGENT_IDS.delivery,
    );
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await spawnTaskAction(teamspaceId, {
          title: title.trim(),
          agentDefinitionId,
          assignee: assignee.trim() || undefined,
          executorType,
        });
        setOpen(false);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create task");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>New task</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>
              Add a work item to this project queue. Agents can also use MCP
              spawn_task.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                required
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-agent">Agent</Label>
              <Select
                value={agentDefinitionId}
                onValueChange={(value) => value && setAgentDefinitionId(value)}
                disabled={isPending}
                items={agentOptions.map((option) => ({
                  value: option.agentDefinitionId,
                  label: option.title,
                }))}
              >
                <SelectTrigger id="task-agent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((option) => (
                    <SelectItem
                      key={option.agentDefinitionId}
                      value={option.agentDefinitionId}
                    >
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-executor">Executor</Label>
              <Select
                value={executorType}
                onValueChange={(value) =>
                  value && setExecutorType(value as "Agent" | "Human" | "System")
                }
                disabled={isPending}
                items={[
                  { value: "Human", label: "Human" },
                  { value: "Agent", label: "Agent" },
                  { value: "System", label: "System" },
                ]}
              >
                <SelectTrigger id="task-executor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Human">Human</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-assignee">Assignee (optional)</Label>
              <Input
                id="task-assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                placeholder="email or agent id"
                disabled={isPending}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
