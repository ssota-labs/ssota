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
  defineWorkflowFormAction,
  runActionJsonFormAction,
} from "@/app/actions";

const sheetClassName = "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg";

export type RunnableAction = {
  actionType: string;
  label: string;
  executor: string;
  preconditions: Record<string, unknown>;
};

export function ActionRunner({
  actions,
  projectId,
}: {
  actions: RunnableAction[];
  projectId: string;
}) {
  const [selectedActionType, setSelectedActionType] = useState(
    actions[0]?.actionType ?? "",
  );
  const selectedAction =
    actions.find((action) => action.actionType === selectedActionType) ??
    actions[0] ??
    null;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const quickFields = selectedAction ? getQuickFields(selectedAction) : [];
  const generatedInput = selectedAction
    ? buildActionInput(selectedAction.actionType, fieldValues)
    : {};
  const [rawInput, setRawInput] = useState(JSON.stringify(generatedInput, null, 2));

  function updateField(key: string, value: string) {
    const nextValues = { ...fieldValues, [key]: value };
    setFieldValues(nextValues);
    if (selectedAction) {
      setRawInput(
        JSON.stringify(buildActionInput(selectedAction.actionType, nextValues), null, 2),
      );
    }
  }

  function selectAction(actionType: string) {
    setSelectedActionType(actionType);
    setFieldValues({});
    const action = actions.find((item) => item.actionType === actionType);
    setRawInput(JSON.stringify(action ? buildActionInput(action.actionType, {}) : {}, null, 2));
  }

  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>Insert</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Run action</SheetTitle>
          <SheetDescription>
            Fill the contract fields first. Raw JSON stays available for advanced
            inputs. Every change still passes through executeAction().
          </SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <select
              id="actionType"
              name="actionType"
              value={selectedActionType}
              onChange={(event) => selectAction(event.currentTarget.value)}
              required
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {actions.map((action) => (
                <option key={action.actionType} value={action.actionType}>
                  {action.label || action.actionType}
                </option>
              ))}
            </select>
          </div>
          {selectedAction ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Executor: {selectedAction.executor} · Required fields:{" "}
              {requiredFields(selectedAction).join(", ") || "none"}
            </div>
          ) : null}
          {quickFields.length ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="text-sm font-medium">Contract fields</div>
              {quickFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`action-field-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`action-field-${field.key}`}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(event) => updateField(field.key, event.currentTarget.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="input">Advanced input JSON</Label>
            <Textarea
              id="input"
              name="input"
              value={rawInput}
              onChange={(event) => setRawInput(event.currentTarget.value)}
            />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function requiredFields(action: RunnableAction) {
  const raw = action.preconditions.requiredFields;
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
}

function getQuickFields(action: RunnableAction) {
  const fields = requiredFields(action).map((field) => ({
    key: field,
    label: labelForField(field),
    placeholder: placeholderForField(field),
    description: descriptionForField(field),
    required: true,
  }));
  if (action.actionType === "create_node") {
    for (const field of [
      {
        key: "title",
        label: "Title",
        placeholder: "New Task",
        description: "Stored as `properties.title`.",
        required: false,
      },
      {
        key: "content",
        label: "Content",
        placeholder: "Describe the work or document body.",
        description: "Stored as node content.",
        required: false,
      },
    ]) {
      if (!fields.some((item) => item.key === field.key)) fields.push(field);
    }
  }
  return fields;
}

function buildActionInput(actionType: string, values: Record<string, string>) {
  const input: Record<string, unknown> = {};
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    if (key === "title") {
      properties.title = value;
      continue;
    }
    if (key === "content") {
      input.content = value;
      continue;
    }
    input[key] = parseFieldValue(value);
  }
  if (Object.keys(properties).length) {
    input.properties = {
      ...(isRecord(input.properties) ? input.properties : {}),
      ...properties,
    };
  }
  if (actionType === "create_node" && !input.content) input.content = "";
  return input;
}

function parseFieldValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) && trimmed !== "" ? numberValue : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function labelForField(field: string) {
  return field
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function placeholderForField(field: string) {
  if (field === "nodeType") return "Task";
  if (field === "nodeId") return "node_...";
  if (field === "properties") return '{ "status": "ready" }';
  return field;
}

function descriptionForField(field: string) {
  if (field === "properties") return "Use JSON for nested property updates.";
  return "This field is required by the action contract.";
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

export function AddWorkflowSheet({
  nodeType,
  projectId,
}: {
  nodeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add workflow</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Add workflow to {nodeType}</SheetTitle>
          <SheetDescription>이 node table에 적용되는 agent workflow를 정의합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineWorkflowFormAction} className="space-y-4 px-6 pb-6">
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
          <Button type="submit">Submit workflow</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
