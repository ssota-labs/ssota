import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { designSystemRules, graphSchemaBoundary } from "@ssota/config/eslint/boundaries.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  // 하네스 경계 룰 — 계약은 packages/contracts/src/invariants/rules.ts
  ...graphSchemaBoundary,
  ...designSystemRules,
];
