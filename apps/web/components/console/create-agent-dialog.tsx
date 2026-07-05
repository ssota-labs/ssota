"use client";

import { useState, useTransition } from "react";
import type { AgentDefinition } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { createAgentDefinitionAction } from "@/app/actions";

export function CreateAgentDialog({
  open,
  teamspaceId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  teamspaceId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (definition: AgentDefinition) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  const submit = () => {
    startTransition(async () => {
      setError(null);
      try {
        const created = await createAgentDefinitionAction(teamspaceId, {
          name,
          description,
        });
        reset();
        onOpenChange(false);
        onCreated(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create agent");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg" data-testid="agent-create-dialog">
        <DialogHeader>
          <DialogTitle>Create agent</DialogTitle>
          <DialogDescription>
            Add a specialist agent for this project. Configure instructions, tools,
            and triggers after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              placeholder="Research assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="agent-create-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-description">When to use</Label>
            <Textarea
              id="agent-description"
              placeholder="Use when the user needs deep research on a topic…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="agent-create-description"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || !name.trim()}
            data-testid="agent-create-submit"
          >
            Create agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
