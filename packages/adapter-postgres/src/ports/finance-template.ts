import { parseActionType, type TemplateBundle } from "@ssota/contracts";

/**
 * Finance 도메인 팩 — 런타임 온톨로지의 **검증 도메인** (ADR-aip-console-concepts).
 *
 * 왜 finance인가: 복식부기는 "액션이 유일한 쓰기 경로"가 실제로 필요한 최소 도메인이다.
 * 전표 한 장은 노드 1 + 분개행 엣지 N을 한 트랜잭션으로 커밋해야 하고(부분 커밋 = 원장 파손),
 * 취소는 되돌림이 아니라 반대 전표이며, 마감은 기간 전체를 읽어 계산해야 한다(L3 워커).
 *
 * 3 object · 3 link · 5 action (+ 마감 워커 1):
 *   objects  finance.account · finance.journal_entry · finance.fiscal_period
 *   links    finance.posts_to(전표→계정, 차/대) · finance.in_period · finance.reverses
 *   actions  open_account · open_period(L2 — 마스터 데이터도 액션으로만 생긴다)
 *            post_journal_entry(L2) · void_journal_entry(L2, set_status)
 *            close_period(L3 function — 워커가 기간 잔액을 읽어 편집을 계산)
 *
 * 시산표 균형(차변 합 = 대변 합)은 **액션 안에서** 성립한다 — post는 항상 1:1 분개행 쌍을
 * 만들고, 그 밖의 경로로는 posts_to 엣지를 만들 수 없다 [ACTION-01].
 */

const money = { type: "integer" as const, minimum: 0, description: "최소 화폐 단위(원)" };

export const FINANCE_TEMPLATE: TemplateBundle = {
  meta: {
    id: "finance",
    name: "Finance (복식부기)",
    description:
      "Double-entry accounting workspace — accounts, journal entries, fiscal periods, and the actions that keep the ledger balanced.",
    category: "Finance",
    icon: "🧾",
  },
  catalog: {
    nodeTypeKeys: [],
    edgeTypeKeys: [],
    nodeTypes: [
      {
        key: "finance.account",
        label: "계정과목",
        description: "원장 계정 — 자산·부채·자본·수익·비용.",
        keywords: ["account", "계정", "계정과목", "코드"],
        propertySchema: {
          type: "object",
          properties: {
            code: { type: "string", minLength: 1, description: "계정 코드 (예: 1000)" },
            accountType: {
              type: "string",
              enum: ["asset", "liability", "equity", "revenue", "expense"],
              description: "계정 분류",
            },
            normalBalance: { type: "string", enum: ["debit", "credit"], description: "정상 잔액 방향" },
            isActive: { type: "boolean", description: "사용 여부" },
          },
          required: ["code", "accountType"],
        },
      },
      {
        key: "finance.journal_entry",
        label: "전표",
        description: "분개 한 장 — posts_to 엣지로 차변/대변 행을 갖는다.",
        keywords: ["journal", "전표", "분개", "je"],
        propertySchema: {
          type: "object",
          properties: {
            entryNo: { type: "string", minLength: 1, description: "전표 번호" },
            postedAt: { type: "string", format: "date", description: "전기일" },
            memo: { type: "string", description: "적요" },
            status: { type: "string", enum: ["draft", "posted", "void"], description: "상태" },
          },
          required: ["entryNo", "postedAt", "status"],
        },
      },
      {
        key: "finance.fiscal_period",
        label: "회계기간",
        description: "월/분기 마감 단위.",
        keywords: ["period", "회계기간", "마감", "close"],
        propertySchema: {
          type: "object",
          properties: {
            code: { type: "string", minLength: 1, description: "기간 코드 (예: 2026-08)" },
            startsOn: { type: "string", format: "date" },
            endsOn: { type: "string", format: "date" },
            status: { type: "string", enum: ["open", "closing", "closed"] },
          },
          required: ["code", "status"],
        },
      },
    ],
    edgeTypes: [
      {
        key: "finance.posts_to",
        label: "분개행",
        description: "전표 → 계정. 한 행의 차변 또는 대변 금액.",
        keywords: ["line", "분개행", "차변", "대변"],
        domainKeys: ["finance.journal_entry"],
        rangeKeys: ["finance.account"],
        propertySchema: {
          type: "object",
          properties: {
            debit: money,
            credit: money,
            lineNo: { type: "integer", minimum: 1 },
          },
          required: ["debit", "credit"],
        },
      },
      {
        key: "finance.in_period",
        label: "기간 귀속",
        description: "전표 → 회계기간.",
        domainKeys: ["finance.journal_entry"],
        rangeKeys: ["finance.fiscal_period"],
        propertySchema: null,
      },
      {
        key: "finance.reverses",
        label: "취소 대상",
        description: "반대 전표 → 원 전표.",
        domainKeys: ["finance.journal_entry"],
        rangeKeys: ["finance.journal_entry"],
        propertySchema: null,
      },
    ],
  },
  agentDefinitions: [],
  pages: [],
  actions: [
    // 계정 개설 — 마스터 데이터도 액션 경로로만 생긴다 [ACTION-01]. 콘솔의 "새 계정" 버튼이 이것이다.
    parseActionType({
      key: "finance.open_account",
      label: "계정 개설",
      description: "원장에 계정과목을 하나 연다.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", minLength: 1, description: "계정 코드 (예: 1000)" },
          name: { type: "string", minLength: 1, description: "계정명" },
          accountType: {
            type: "string",
            enum: ["asset", "liability", "equity", "revenue", "expense"],
            description: "계정 분류",
          },
        },
        required: ["code", "name", "accountType"],
      },
      writes: ["finance.account"],
      edits: {
        kind: "declarative",
        edits: [
          {
            op: "create_node",
            catalogKey: "finance.account",
            title: { $param: "name" },
            properties: {
              code: { $param: "code" },
              accountType: { $param: "accountType" },
              isActive: true,
            },
          },
        ],
      },
    }),
    // 회계기간 개설.
    parseActionType({
      key: "finance.open_period",
      label: "회계기간 개설",
      description: "마감 단위가 되는 회계기간을 연다.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", minLength: 1, description: "기간 코드 (예: 2026-08)" },
          startsOn: { type: "string", format: "date" },
          endsOn: { type: "string", format: "date" },
        },
        required: ["code"],
      },
      writes: ["finance.fiscal_period"],
      edits: {
        kind: "declarative",
        edits: [
          {
            op: "create_node",
            catalogKey: "finance.fiscal_period",
            title: { $param: "code" },
            properties: {
              code: { $param: "code" },
              startsOn: { $param: "startsOn" },
              endsOn: { $param: "endsOn" },
              status: "open",
            },
          },
        ],
      },
    }),
    // 전기 — 노드 1 + 분개행 2를 한 트랜잭션으로. 균형은 같은 amount를 차/대에 한 번씩 써서 성립한다.
    parseActionType({
      key: "finance.post_journal_entry",
      label: "전표 전기",
      description: "차변 계정과 대변 계정에 같은 금액을 기록하는 전표 한 장을 만든다.",
      parameters: {
        type: "object",
        properties: {
          entryNo: { type: "string", minLength: 1, description: "전표 번호" },
          postedAt: { type: "string", format: "date", description: "전기일" },
          memo: { type: "string", description: "적요" },
          debitAccountId: { type: "string", format: "uuid", description: "차변 계정" },
          creditAccountId: { type: "string", format: "uuid", description: "대변 계정" },
          amount: { type: "integer", minimum: 1, description: "금액" },
        },
        required: ["entryNo", "postedAt", "debitAccountId", "creditAccountId", "amount"],
      },
      writes: ["finance.journal_entry", "finance.posts_to"],
      edits: {
        kind: "declarative",
        edits: [
          {
            op: "create_node",
            ref: "entry",
            catalogKey: "finance.journal_entry",
            title: { $param: "entryNo" },
            properties: {
              entryNo: { $param: "entryNo" },
              postedAt: { $param: "postedAt" },
              memo: { $param: "memo" },
              status: "posted",
            },
          },
          {
            op: "create_edge",
            catalogKey: "finance.posts_to",
            from: { ref: "entry" },
            to: { id: { $param: "debitAccountId" } },
            properties: { debit: { $param: "amount" }, credit: 0, lineNo: 1 },
          },
          {
            op: "create_edge",
            catalogKey: "finance.posts_to",
            from: { ref: "entry" },
            to: { id: { $param: "creditAccountId" } },
            properties: { debit: 0, credit: { $param: "amount" }, lineNo: 2 },
          },
        ],
      },
    }),
    // 취소 — 원장은 지우지 않는다. 상태를 void로 바꾸고(posted에서만) 반대 전표를 건다.
    parseActionType({
      key: "finance.void_journal_entry",
      label: "전표 취소",
      description: "전기된 전표를 void로 표시한다. 원 전표와 분개행은 남는다.",
      parameters: {
        type: "object",
        properties: {
          entryId: { type: "string", format: "uuid", description: "취소할 전표" },
          reason: { type: "string", description: "취소 사유" },
        },
        required: ["entryId"],
      },
      writes: ["finance.journal_entry"],
      aggregateRootParam: "entryId",
      edits: {
        kind: "declarative",
        edits: [
          { op: "set_status", node: { id: { $param: "entryId" } }, to: "void", from: ["posted"] },
          {
            op: "update_properties",
            node: { id: { $param: "entryId" } },
            properties: { voidReason: { $param: "reason" } },
          },
        ],
      },
    }),
    // 마감 — 기간 전체를 읽어야 하므로 L3. 워커는 커밋하지 않고 편집 + 가드만 반환한다 [ACTION-03].
    parseActionType({
      key: "finance.close_period",
      label: "기간 마감",
      description:
        "회계기간을 마감한다. 워커가 기간의 전표를 읽어 잔액을 검증하고 상태 전이를 계산한다 (L3).",
      parameters: {
        type: "object",
        properties: {
          periodId: { type: "string", format: "uuid", description: "마감할 회계기간" },
        },
        required: ["periodId"],
      },
      writes: ["finance.fiscal_period"],
      requires: { roles: ["owner"] },
      aggregateRootParam: "periodId",
      gate: true,
      edits: { kind: "function", workerKey: "finance.close_period" },
    }),
  ],
};

/**
 * 데모 인스턴스 — 계정 4개 + 회계기간 1개 + 전표 2장을 **액션 경로로만** 만든다 [ACTION-01].
 * 시드조차 예외를 두지 않는다는 것이 이 함수의 요점이다.
 */
export const FINANCE_DEMO_ACCOUNTS = [
  { code: "1000", name: "현금", accountType: "asset" },
  { code: "1100", name: "매출채권", accountType: "asset" },
  { code: "4000", name: "매출", accountType: "revenue" },
  { code: "5000", name: "지급수수료", accountType: "expense" },
] as const;
