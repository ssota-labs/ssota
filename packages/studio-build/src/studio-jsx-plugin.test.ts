import { describe, expect, it } from "vitest";
import { transformStudioJsxSource } from "./studio-jsx-plugin.js";

describe("transformStudioJsxSource", () => {
  it("injects studio data attributes on JSX elements", () => {
    const source = `export default function Component() {
  return <button className="studio-test">Hello</button>;
}`;
    const transformed = transformStudioJsxSource(source, "Component.tsx");
    expect(transformed).toContain("data-studio-id=");
    expect(transformed).toContain("data-studio-file=");
    expect(transformed).toContain("data-studio-loc=");
  });
});
