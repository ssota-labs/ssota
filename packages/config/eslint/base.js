import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { designSystemRules, graphSchemaBoundary } from "./boundaries.js";

/** @type {import("eslint").Linter.Config[]} */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // 하네스 경계 룰 — 계약은 packages/contracts/src/invariants/rules.ts
  ...graphSchemaBoundary,
  ...designSystemRules,
);
