/**
 * 하네스 ESLint 경계 룰 — 계약(packages/contracts/src/invariants/rules.ts)의
 * eslint enforcement 구현. 에러 메시지는 [ID] + 다음 행동 지시를 담는다.
 *
 * 설계 주의: ESLint flat config에서 같은 룰 이름은 나중 config가 통째로 교체한다.
 * 그래서 no-restricted-imports 계열은 스코프당 하나의 결합 설정만 둔다 —
 * 여러 export를 같은 파일 스코프에 겹쳐 spread하지 말 것.
 */
import { HARNESS_ESLINT_ALLOWLISTS } from "./allowlists.js";

const offOverride = (files, ruleNames) =>
  files.length === 0
    ? []
    : [
        {
          files,
          rules: Object.fromEntries(ruleNames.map((name) => [name, "off"])),
        },
      ];

const GRAPH_02_MSG =
  "[GRAPH-02] 그래프 쓰기는 GraphWritePort(또는 core graph use-case)로만 합니다. nodes/edges/schema 직접 import 금지 — packages/core의 graph use-case·port를 사용하세요. 정당한 예외는 packages/config/eslint/allowlists.js에 사유와 함께 등록하고 계약 allowlist에도 반영하세요.";

const ARCH_02_MSG =
  "[ARCH-02] adapter 내부 경로(deep import)를 참조하지 않습니다 — 패키지 public export만 사용하세요. 필요한 심볼이 export되지 않았다면 adapter의 index에 공식 export를 추가하는 PR을 만드세요.";

/**
 * [GRAPH-02] + [ARCH-02] — 전 워크스페이스 공용 (base.js에 spread).
 * adapter가 index에서 `schema` 객체를 통째로 re-export하므로 schema 제한이 핵심이다.
 */
export const graphSchemaBoundary = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@ssota/adapter-postgres",
              importNames: ["nodes", "edges", "schema"],
              message: GRAPH_02_MSG,
            },
            {
              name: "@ssota/adapter-supabase",
              importNames: ["nodes", "edges", "schema"],
              message: GRAPH_02_MSG,
            },
          ],
          patterns: [
            {
              group: ["@ssota/adapter-postgres/src/*", "@ssota/adapter-supabase/src/*"],
              message: ARCH_02_MSG,
            },
          ],
        },
      ],
    },
  },
  ...offOverride(HARNESS_ESLINT_ALLOWLISTS.graphSchemaBoundary, ["no-restricted-imports"]),
];

/**
 * [ARCH-01] — packages/core 전용. core는 IO 의존 0: adapter·runtime·next 참조 금지.
 * core의 eslint.config.js에서만 spread한다 (base의 no-restricted-imports를 교체하므로
 * graph 관련 paths도 여기에 포함되어 있다).
 */
export const coreIsolation = [
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@ssota/adapter-postgres",
              message: "[ARCH-01] packages/core는 IO 의존 0입니다 — adapter를 import하지 않습니다. 의존 방향: apps/* → core ← adapters.",
            },
            {
              name: "@ssota/adapter-supabase",
              message: "[ARCH-01] packages/core는 IO 의존 0입니다 — adapter를 import하지 않습니다.",
            },
            {
              name: "@ssota/agent-runtime",
              message: "[ARCH-01] packages/core는 agent-runtime을 참조하지 않습니다 — 필요한 계약은 port 인터페이스로 선언하세요.",
            },
          ],
          patterns: [
            {
              group: ["@ssota/adapter-*", "next", "next/*"],
              message: "[ARCH-01] packages/core는 IO·프레임워크 의존 0입니다. 필요한 기능은 port 인터페이스로 선언하고 adapter에서 구현하세요.",
            },
          ],
        },
      ],
    },
  },
];

/**
 * [DS-03] — Radix asChild 금지 (Base UI render prop 사용). tsx 전용이라
 * no-restricted-imports와 충돌하지 않는다.
 */
export const designSystemRules = [
  {
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: 'JSXAttribute[name.name="asChild"]',
          message:
            "[DS-03] Radix asChild 패턴을 사용하지 않습니다 — Base UI render prop으로 trigger/close를 구성하세요 (DESIGN.md §7, .cursor/rules/design.mdc). 예외는 packages/config/eslint/allowlists.js에 등록.",
        },
      ],
    },
  },
  ...offOverride(HARNESS_ESLINT_ALLOWLISTS.designSystemRules, ["no-restricted-syntax"]),
];
