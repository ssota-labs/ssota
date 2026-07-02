import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rewriteGeneratedText, rewriteImportSpecifiers } from "./rewrite-imports.mjs";

describe("rewriteImportSpecifiers", () => {
  it("rewrites exact workspace package imports to local toolcraft imports", () => {
    const source = `
import { defineToolcraft } from "@repo/toolcraft-runtime";
import { ToolcraftApp } from "@repo/toolcraft-runtime/react";
import { Button } from '@repo/ui';
import { Tooltip } from "@repo/ui/primitives";
import { Panel } from "@repo/ui/panel";
import { Slider } from "@repo/ui/controls";
import { getToolcraftComponentContract } from "@repo/toolcraft-runtime/contracts";
import "@repo/ui/styles.css";
`;

    assert.equal(
      rewriteImportSpecifiers(source),
      `
import { defineToolcraft } from "@/toolcraft/runtime";
import { ToolcraftApp } from "@/toolcraft/runtime/react";
import { Button } from '@/toolcraft/ui';
import { Tooltip } from "@/toolcraft/ui/components/primitives";
import { Panel } from "@/toolcraft/ui/components/panel";
import { Slider } from "@/toolcraft/ui/components/controls";
import { getToolcraftComponentContract } from "@/toolcraft/runtime/contracts/component-contracts";
import "@/toolcraft/ui/styles.css";
`,
    );
  });

  it("does not rewrite package names that only share a prefix", () => {
    const source = `import value from "@repo/ui-extra";`;

    assert.equal(rewriteImportSpecifiers(source), source);
  });
});

describe("rewriteGeneratedText", () => {
  it("rewrites starter css package sources", () => {
    const source = `
@source "../../packages/ui/src";
@source "../../packages/toolcraft-runtime/src";
@import "@repo/toolcraft-runtime/styles.css";
`;

    assert.equal(
      rewriteGeneratedText(source),
      `
@source "./toolcraft/ui";
@source "./toolcraft/runtime";
@import "@/toolcraft/runtime/styles.css";
`,
    );
  });
});
