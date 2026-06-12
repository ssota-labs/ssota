"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  addNodePropertyFormAction,
  defineScopedActionFormAction,
  defineWorkflowInstructionFormAction,
  runActionJsonFormAction,
} from "@/app/actions";

const sheetClassName = "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg";

export function ActionRunner({
  actions,
  projectId,
}: {
  actions: string[];
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>Insert</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Run action</SheetTitle>
          <SheetDescription>
            JSON input으로 action을 실행합니다. 모든 변경은 executeAction()을 통과합니다.
          </SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" list="node-actions" required />
            <datalist id="node-actions">
              {actions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="input">Input JSON</Label>
            <Textarea id="input" name="input" defaultValue={'{ "title": "New node", "content": "" }'} />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function AddPropertySheet({
  nodeType,
  projectId,
}: {
  nodeType: string;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await addNodePropertyFormAction(formData);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add property
      </Button>
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex h-full w-3/4 max-w-lg flex-col border-l bg-popover text-popover-foreground shadow-lg">
          <div className="space-y-1.5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium">Add property to {nodeType}</h2>
                <p className="text-xs/relaxed text-muted-foreground">
                  update_node_property_schema로 node-local schema에 필드를 추가합니다.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          <form action={handleSubmit} className="space-y-4 px-6 pb-6">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="nodeType" value={nodeType} />
            <div className="space-y-2">
              <Label htmlFor="propertyKey">Property key</Label>
              <Input id="propertyKey" name="propertyKey" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueType">Value type</Label>
              <Input id="valueType" name="valueType" defaultValue="string" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints JSON</Label>
              <Textarea id="constraints" name="constraints" defaultValue="{}" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting..." : "Submit change"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

export function AddActionSheet({
  nodeType,
  projectId,
}: {
  nodeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add action</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Add action to {nodeType}</SheetTitle>
          <SheetDescription>scope=node_type:{nodeType}로 action contract를 생성합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="scopeKind" value="node_type" />
          <input type="hidden" name="nodeType" value={nodeType} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" placeholder="publish_document" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preconditions">Preconditions JSON</Label>
            <Textarea id="preconditions" name="preconditions" defaultValue='{ "requiredFields": ["nodeId"] }' />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effects">Effects JSON array</Label>
            <Textarea id="effects" name="effects" defaultValue="[]" />
          </div>
          <Button type="submit">Submit action contract</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function AddInstructionSheet({
  nodeType,
  projectId,
}: {
  nodeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add instruction</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Add instruction to {nodeType}</SheetTitle>
          <SheetDescription>이 node table에 적용되는 agent workflow를 정의합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineWorkflowInstructionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="scopeKind" value="node_type" />
          <input type="hidden" name="nodeType" value={nodeType} />
          <input type="hidden" name="applicableNodeTypes" value={nodeType} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggerPatterns">Trigger patterns</Label>
            <Input id="triggerPatterns" name="triggerPatterns" defaultValue="manual" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedActions">Allowed actions</Label>
            <Input id="allowedActions" name="allowedActions" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflowSteps">Workflow steps JSON array</Label>
            <Textarea id="workflowSteps" name="workflowSteps" defaultValue="[]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" name="body" required />
          </div>
          <Button type="submit">Submit instruction</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
