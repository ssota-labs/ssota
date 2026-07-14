"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LinkSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "../context";
import { boundNode, boundNodesByKey } from "../bindings";
import type { BindingContext, CatalogComponent, RenderNode } from "../types";

/**
 * RelationEditor — 특정 edge 타입의 링크를 제품 안에서 편집하는 컴팩트 카드.
 * subject 노드(`binding`) 기준으로 현재 연결된 노드(`linked`, traverse 바인딩)를
 * 나열하고 각 행에 제거 버튼을, 하단에 후보(`candidates`, query 바인딩) 검색
 * 콤보박스("연결 추가")를 제공한다. 추가는 `addAction` 에
 * `{ sourceNodeId, targetNodeId }` 를, 제거는 `removeAction` 에
 * `{ edgeId, sourceNodeId, targetNodeId }` 를 즉시 dispatch 한다 — 페이지가
 * create_edge / delete_edge 액션 디스크립터로 배선한다. 제거에 필요한
 * `edgeId` 는 traverse 바인딩이 각 노드에 실어 보내는 `__edgeId` 에서 읽는다.
 */

/** traverse 바인딩이 실어 보내는 연결 edge id (core ResolvedNode.__edgeId). */
type LinkedNode = RenderNode & { __edgeId?: string };

/** 콤보박스 옵션 ({value,label} 은 Base UI Combobox 가 자동 인식). */
type CandidateOption = { value: string; label: string };

/** `"title"` 또는 노드 property 를 표시 필드로 읽는다 (DataTable readCell 계열). */
function readLabel(node: RenderNode, labelField: string): string {
  const raw =
    labelField === "title"
      ? node.title
      : (node.properties as Record<string, unknown>)?.[labelField];
  const label = raw == null ? "" : String(raw);
  return label || node.title || "제목 없음";
}

/** 연결된 노드 한 행: 표시 라벨 + 제거 버튼. */
function LinkedRow({
  subjectId,
  node,
  labelField,
  removeAction,
}: {
  subjectId: string;
  node: LinkedNode;
  labelField: string;
  removeAction?: string;
}) {
  const onAction = useAction();
  const [pending, setPending] = useState(false);
  // 제거에는 delete_edge 용 edgeId 가 필요 — traverse 바인딩이 아닌 데이터
  // (예: query 바인딩)에는 __edgeId 가 없으므로 버튼을 비활성화한다.
  const edgeId = typeof node.__edgeId === "string" ? node.__edgeId : undefined;
  const canRemove = Boolean(onAction && removeAction && edgeId) && !pending;

  const remove = async () => {
    if (!onAction || !removeAction || !edgeId) return;
    setPending(true);
    try {
      await onAction(removeAction, {
        edgeId,
        sourceNodeId: subjectId,
        targetNodeId: node.id,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="border-border flex items-center justify-between gap-2 border-b px-4 py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <LinkSimpleIcon
          className="text-muted-foreground size-3.5 shrink-0"
          aria-hidden
        />
        <span className="text-foreground truncate text-sm">
          {readLabel(node, labelField)}
        </span>
      </div>
      {removeAction ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive size-6 shrink-0"
          disabled={!canRemove}
          onClick={() => void remove()}
          aria-label={`${readLabel(node, labelField)} 연결 해제`}
        >
          {pending ? (
            <Spinner className="size-3.5" />
          ) : (
            <XIcon className="size-3.5" />
          )}
        </Button>
      ) : null}
    </li>
  );
}

/** "연결 추가" 콤보박스: 후보를 고르면 즉시 addAction 을 dispatch 한다. */
function AddLinkCombobox({
  subjectId,
  candidates,
  labelField,
  addAction,
}: {
  subjectId: string;
  candidates: RenderNode[];
  labelField: string;
  addAction: string;
}) {
  const onAction = useAction();
  const [pending, setPending] = useState(false);
  const options: CandidateOption[] = candidates.map((c) => ({
    value: c.id,
    label: readLabel(c, labelField),
  }));

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">추가할 후보가 없습니다</p>
    );
  }

  const add = async (targetNodeId: string) => {
    if (!onAction) return;
    setPending(true);
    try {
      await onAction(addAction, { sourceNodeId: subjectId, targetNodeId });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Combobox
          items={options}
          value={null}
          onValueChange={(val: CandidateOption | null) => {
            if (val) void add(val.value);
          }}
          isItemEqualToValue={(a: CandidateOption, b: CandidateOption) =>
            a.value === b.value
          }
          itemToStringLabel={(o: CandidateOption) => o.label}
          disabled={pending || !onAction}
        >
          <ComboboxInput className="w-full" placeholder="연결 추가…" />
          <ComboboxContent>
            <ComboboxEmpty>일치하는 항목이 없습니다</ComboboxEmpty>
            <ComboboxList>
              {options.map((o) => (
                <ComboboxItem key={o.value} value={o}>
                  {o.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {pending ? <Spinner className="size-3.5 shrink-0" /> : null}
    </div>
  );
}

/** RelationEditor 본체: 헤더 + 연결 목록 + 추가 콤보박스. */
function RelationEditorEl({
  subject,
  linked,
  candidates,
  addAction,
  removeAction,
  title,
  emptyLabel,
  direction,
  labelField,
}: {
  subject: RenderNode | undefined;
  linked: LinkedNode[];
  candidates: RenderNode[];
  addAction?: string;
  removeAction?: string;
  title?: string;
  emptyLabel?: string;
  direction?: "out" | "in";
  labelField: string;
}) {
  // subject 미해결 → 명확한 placeholder (다른 data 컴포넌트들과 동일 패턴).
  if (!subject) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-4 text-xs">
        {emptyLabel ?? "연결을 편집할 대상 레코드가 없습니다."}
      </div>
    );
  }

  const linkedIds = new Set(linked.map((n) => n.id));
  const addable = candidates.filter(
    (c) => !linkedIds.has(c.id) && c.id !== subject.id,
  );
  const DirectionIcon = direction === "in" ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-medium">
            {title ?? "연결"}
          </h3>
          {direction ? (
            <DirectionIcon
              className="text-muted-foreground size-3.5 shrink-0"
              aria-label={direction === "in" ? "들어오는 연결" : "나가는 연결"}
            />
          ) : null}
        </div>
        <Badge variant="outline" className="font-normal tabular-nums">
          {linked.length}
        </Badge>
      </div>
      <Separator />
      {linked.length === 0 ? (
        <p className="text-muted-foreground px-4 py-2.5 text-sm">
          {emptyLabel ?? "연결된 항목이 없습니다"}
        </p>
      ) : (
        <ul>
          {linked.map((node) => (
            <LinkedRow
              key={node.__edgeId ?? node.id}
              subjectId={subject.id}
              node={node}
              labelField={labelField}
              removeAction={removeAction}
            />
          ))}
        </ul>
      )}
      {addAction ? (
        <>
          <Separator />
          <div className="px-4 py-3">
            <AddLinkCombobox
              subjectId={subject.id}
              candidates={addable}
              labelField={labelField}
              addAction={addAction}
            />
          </div>
        </>
      ) : null}
    </Card>
  );
}

/** `linked` 바인딩 노드에 실려 온 `__edgeId` 를 보존한 채 배열로 캐스팅. */
function boundLinkedNodes(
  bindingData: BindingContext,
  key: string | undefined,
): LinkedNode[] {
  return boundNodesByKey(bindingData, key) as LinkedNode[];
}

export const relationEditorComponents: Record<string, CatalogComponent> = {
  RelationEditor: ({ props, bindingData }) => (
    <RelationEditorEl
      subject={boundNode(bindingData, props)}
      linked={boundLinkedNodes(
        bindingData,
        typeof props.linked === "string" ? props.linked : undefined,
      )}
      candidates={boundNodesByKey(
        bindingData,
        typeof props.candidates === "string" ? props.candidates : undefined,
      )}
      addAction={typeof props.addAction === "string" ? props.addAction : undefined}
      removeAction={
        typeof props.removeAction === "string" ? props.removeAction : undefined
      }
      title={typeof props.title === "string" ? props.title : undefined}
      emptyLabel={
        typeof props.emptyLabel === "string" ? props.emptyLabel : undefined
      }
      direction={
        props.direction === "in" || props.direction === "out"
          ? props.direction
          : undefined
      }
      labelField={
        typeof props.labelField === "string" ? props.labelField : "title"
      }
    />
  ),
};
