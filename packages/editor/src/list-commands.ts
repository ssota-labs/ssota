import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ResolvedPos } from "@tiptap/pm/model";

export type EditorListType = "bulletList" | "orderedList";

type ListNodeMatch = {
  type: EditorListType;
  pos: number;
  depth: number;
};

function isEditorListType(name: string): name is EditorListType {
  return name === "bulletList" || name === "orderedList";
}

/** 현재 커서가 속한 가장 안쪽 bullet/numbered list */
export function findInnermostList($from: ResolvedPos): ListNodeMatch | null {
  let match: ListNodeMatch | null = null;

  for (let depth = 1; depth <= $from.depth; depth += 1) {
    const node = $from.node(depth);
    if (isEditorListType(node.type.name)) {
      match = {
        type: node.type.name,
        pos: $from.before(depth),
        depth,
      };
    }
  }

  return match;
}

/**
 * Notion처럼 현재 들여쓰기 레벨의 list 타입만 전환한다.
 * - 리스트 밖: 새 리스트 생성/해제
 * - 리스트 안: 가장 안쪽 list 노드만 bullet ↔ numbered 전환
 */
export function applyListType(editor: Editor, listType: EditorListType): boolean {
  const { state } = editor;
  const innermost = findInnermostList(state.selection.$from);

  if (!innermost) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  if (innermost.type === listType) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  const targetType = state.schema.nodes[listType];
  const currentNode = state.doc.nodeAt(innermost.pos);
  if (!currentNode || !targetType) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        tr.setNodeMarkup(innermost.pos, targetType, currentNode.attrs, currentNode.marks);
      }
      return true;
    })
    .run();
}

/** ordered 안에 bullet, bullet 안에 ordered 등 혼합 중첩이 있는지 검사 */
export function hasMixedListNesting(doc: Editor["state"]["doc"]): boolean {
  let mixed = false;

  const visit = (node: ProseMirrorNode, enclosingList: EditorListType | null) => {
    if (mixed || !node) return;

    if (isEditorListType(node.type.name)) {
      if (enclosingList && enclosingList !== node.type.name) {
        mixed = true;
        return;
      }

      const listType = node.type.name;
      node.forEach((listItem) => {
        listItem.forEach((child) => visit(child, listType));
      });
      return;
    }

    node.forEach((child) => visit(child, enclosingList));
  };

  doc.forEach((child) => visit(child, null));
  return mixed;
}
