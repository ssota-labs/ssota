import { describe, expect, it } from "vitest";
import type { UiComponentDocument } from "@ssota/contracts/catalog";
import { exportUiComponentDocumentToJsx } from "./export-jsx";

describe("export-jsx", () => {
  it("exports element tree to JSX", () => {
    const doc: UiComponentDocument = {
      schemaVersion: 1,
      root: {
        kind: "element",
        id: "root",
        tag: "div",
        className: "p-4",
        children: [{ kind: "text", id: "label", text: "Hello" }],
      },
    };

    const jsx = exportUiComponentDocumentToJsx(doc.root);
    expect(jsx).toContain('className="p-4"');
    expect(jsx).toContain("Hello");
    expect(jsx).toContain("export function Component()");
  });
});
