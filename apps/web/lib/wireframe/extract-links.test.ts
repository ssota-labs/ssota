import { describe, expect, it } from "vitest";
import {
  deriveWireframeEdges,
  extractNavigateToTargets,
} from "./extract-links";

describe("extractNavigateToTargets", () => {
  it("collects navigateTo slugs from JSX", () => {
    const jsx = `
      <Screen>
        <Button navigateTo="login">Sign in</Button>
        <Link navigateTo='media-timeline' />
        <NavItem navigateTo={"upload"} />
      </Screen>
    `;
    expect(extractNavigateToTargets(jsx).sort()).toEqual(
      ["login", "media-timeline", "upload"].sort(),
    );
  });
});

describe("deriveWireframeEdges", () => {
  it("builds directed edges between known slugs", () => {
    const edges = deriveWireframeEdges([
      { slug: "welcome", jsx: '<Button navigateTo="login" />' },
      { slug: "login", jsx: '<Link navigateTo="home" />' },
    ]);
    expect(edges).toEqual([
      { sourceSlug: "welcome", targetSlug: "login" },
      { sourceSlug: "login", targetSlug: "home" },
    ]);
  });
});
