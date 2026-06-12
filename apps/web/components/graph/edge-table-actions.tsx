"use client";

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
import { defineScopedActionFormAction, runActionJsonFormAction } from "@/app/actions";

const sheetClassName = "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg";

export function RunEdgeActionSheet({
  edgeType,
  projectId,
}: {
  edgeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>Create edge / Run action</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Run edge action</SheetTitle>
          <SheetDescription>create_edge action input을 JSON으로 제출합니다.</SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="input">Input JSON</Label>
            <Textarea
              id="input"
              name="input"
              defaultValue={`{ "edgeType": "${edgeType}", "sourceNodeId": "", "targetNodeId": "", "properties": {} }`}
            />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function AddEdgeActionSheet({
  edgeType,
  projectId,
}: {
  edgeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>Add action</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Add action to {edgeType}</SheetTitle>
          <SheetDescription>scope=edge_type:{edgeType}로 action contract를 생성합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="scopeKind" value="edge_type" />
          <input type="hidden" name="edgeType" value={edgeType} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" />
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
