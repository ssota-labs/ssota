"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { defineNodeTypeFormAction } from "@/app/actions";
import { OutcomeBadge } from "@/components/outcome-badge";
import type { Archetype } from "@ssota/core";
import type { ExecuteActionResult } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@ssota/ui/components/ui/native-select";
import { Textarea } from "@ssota/ui/components/ui/textarea";

interface DefineNodeTypeFormProps {
  archetypes: Archetype[];
}

export function DefineNodeTypeForm({ archetypes }: DefineNodeTypeFormProps) {
  const [result, setResult] = useState<ExecuteActionResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);
    try {
      const actionResult = await defineNodeTypeFormAction(formData);
      setResult(actionResult);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Node Type Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nodeType">Node Type</Label>
                <Input
                  id="nodeType"
                  name="nodeType"
                  placeholder="Memo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="family">Family</Label>
                <NativeSelect
                  id="family"
                  name="family"
                  defaultValue="document"
                  className="w-full"
                >
                  <NativeSelectOption value="document">document</NativeSelectOption>
                  <NativeSelectOption value="operational">
                    operational
                  </NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="archetypeId">Archetype (선택)</Label>
              <NativeSelect
                id="archetypeId"
                name="archetypeId"
                className="w-full"
                defaultValue=""
              >
                <NativeSelectOption value="">없음</NativeSelectOption>
                {archetypes.map((archetype) => (
                  <NativeSelectOption key={archetype.id} value={archetype.id}>
                    {archetype.name} ({archetype.id})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentGuide">Content Guide</Label>
              <Textarea
                id="contentGuide"
                name="contentGuide"
                placeholder="이 노드 타입의 content 작성 가이드"
              />
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? "실행 중…" : "define_node_type 실행"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Result <OutcomeBadge outcome={result.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.status === "committed" && (
              <p>
                커밋됨 ·{" "}
                <Link href="/log" className="underline">
                  Runs
                </Link>{" "}
                에서 확인하세요.
              </p>
            )}
            {result.status === "gated" && (
              <p>
                Review 대기 ·{" "}
                <Link href="/gates" className="underline">
                  Review #{result.gateId.slice(0, 8)}
                </Link>
              </p>
            )}
            {result.status === "rejected" && (
              <p className="text-destructive">
                {result.code}: {result.reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
