"use client";

import { useState } from "react";
import Link from "next/link";
import { defineNodeTypeFormAction } from "@/app/actions";
import { OutcomeBadge } from "@/components/outcome-badge";
import type { Archetype } from "@loopos/core";
import type { ExecuteActionResult } from "@loopos/contracts";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@loopos/ui/components/ui/native-select";
import { Textarea } from "@loopos/ui/components/ui/textarea";

interface DefineNodeTypeFormProps {
  archetypes: Archetype[];
}

export function DefineNodeTypeForm({ archetypes }: DefineNodeTypeFormProps) {
  const [result, setResult] = useState<ExecuteActionResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
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
          <form action={handleSubmit} className="space-y-4">
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
              <Label htmlFor="archetypeId">Archetype</Label>
              <NativeSelect
                id="archetypeId"
                name="archetypeId"
                required
                className="w-full"
                defaultValue=""
              >
                <NativeSelectOption value="" disabled>
                  아키타입 선택
                </NativeSelectOption>
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
                  Action Log
                </Link>{" "}
                에서 확인하세요.
              </p>
            )}
            {result.status === "gated" && (
              <p>
                Human Gate 대기 ·{" "}
                <Link href="/gates" className="underline">
                  Gate #{result.gateId.slice(0, 8)}
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
