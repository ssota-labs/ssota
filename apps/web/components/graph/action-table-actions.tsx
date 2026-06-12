"use client";

import Link from "next/link";
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
import { runActionJsonFormAction } from "@/app/actions";

const sheetClassName = "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg";

export function RunActionSheet({
  actionType,
  projectId,
  defaultInput = "{}",
}: {
  actionType: string;
  projectId: string;
  defaultInput?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>Run action</SheetTrigger>
      <SheetContent className={sheetClassName}>
        <SheetHeader>
          <SheetTitle>Run {actionType}</SheetTitle>
          <SheetDescription>JSON input으로 action을 실행합니다.</SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="actionType" value={actionType} />
          <div className="space-y-2">
            <Label htmlFor="input">Input JSON</Label>
            <Textarea id="input" name="input" defaultValue={defaultInput} />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ViewFullLogButton({ href }: { href: string }) {
  return (
    <Button
      render={<Link href={href} />}
      variant="outline"
      size="sm"
      nativeButton={false}
    >
      View full log
    </Button>
  );
}
