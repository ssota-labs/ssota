import type { ResolvedPos } from "@tiptap/pm/model";

const LIST_ITEM_TYPES = new Set(["listItem", "taskItem"]);

/**
 * 블록 선택 depth를 결정한다.
 *
 * Notion은 들여쓰기 속성을 가진 평면 블록이지만, ProseMirror 리스트는
 * `listItem`이 자식 중첩 리스트까지 DOM `<li>` 안에 포함한다.
 * 커서가 있는 **가장 안쪽 listItem** depth를 쓰면 줄 단위로 선택된다.
 */
export function resolveBlockSelectionDepth(
  $from: ResolvedPos,
  $to: ResolvedPos,
  fixedDepth?: number,
): number | undefined {
  if (typeof fixedDepth === "number" && fixedDepth >= 0) {
    return fixedDepth;
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (LIST_ITEM_TYPES.has($from.node(depth).type.name)) {
      return depth;
    }
  }

  if ($from.sameParent($to)) {
    return Math.max(0, $from.sharedDepth($to.pos) - 1);
  }

  return $from.sharedDepth($to.pos);
}
