import type { UiComponentDocument } from "@ssota/contracts/catalog";

export function createEmptyUiComponentDocument(): UiComponentDocument {
  return {
    schemaVersion: 1,
    root: {
      kind: "element",
      id: "root",
      tag: "div",
      className: "flex flex-col gap-4 p-6",
      children: [
        {
          kind: "text",
          id: "heading",
          text: "New component",
        },
      ],
    },
  };
}
