import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { designSystemRules, graphSchemaBoundary } from "@ssota/config/eslint/boundaries.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  // 하네스 경계 룰 — 계약은 packages/contracts/src/invariants/rules.ts
  ...graphSchemaBoundary,
  ...designSystemRules,
  {
    rules: {
      // React Compiler lint rules flag widespread sync-props / ref-sync patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
