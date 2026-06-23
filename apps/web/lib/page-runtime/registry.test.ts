import { describe, expect, it } from "vitest";
import { PAGE_COMPONENT_KEYS } from "@ssota/contracts/page";
import { UI_CATALOG_COMPONENTS } from "./registry";

/**
 * The React component registry (this package) and the serializable descriptor
 * catalog (@ssota/contracts/page, used by the agent's list_page_components tool
 * and create_page validation) must describe the SAME set of component keys.
 * If you add/remove a component, update both.
 */
describe("page component registry ↔ descriptor catalog parity", () => {
  it("exposes identical component keys in both registries", () => {
    expect([...UI_CATALOG_COMPONENTS].sort()).toEqual(
      [...PAGE_COMPONENT_KEYS].sort(),
    );
  });
});
