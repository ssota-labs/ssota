# LoopOS Phase 2 Technical Design: Type-specific Meta Actions

## 1. 설계 요약

Phase 2는 Catalog Studio를 타입별 메타 액션 기반으로 구현한다. 웹은 Studio UX를 제공하지만 Catalog mutation은 직접 CRUD가 아니라 `executeAction()`을 통해 수행된다. MCP 에이전트도 동일한 action contract를 사용한다.

```txt
Web Studio Form                 MCP Agent
      │                            │
      └──────── executeAction ─────┘
                    │
              Core Enforcement
                    │
        ActionCommitPort.commit()
                    │
       Catalog Effects + Action Log
                    │
            Runtime Catalog
```

## 2. 핵심 원칙

1. `executeAction()`은 Runtime Graph와 Catalog mutation의 유일한 write funnel이다.
2. Catalog mutation은 타입별 메타 액션으로 표현한다.
3. Catalog effect와 Action Log는 단일 transaction으로 commit한다.
4. Web과 MCP는 같은 contracts를 공유한다.
5. Agent executor의 Catalog mutation은 기본적으로 Gate required다.
6. Bootstrap meta actions는 seed/migration으로 등록하고, 이후 변경은 meta action으로 수행한다.
7. Catalog Changes UI는 Action Log/Gate를 읽는 projection이어야 한다.

## 3. 기존 구조와 확장 지점

### 기존 구조

| 영역 | 현재 역할 |
| --- | --- |
| `packages/contracts` | Zod schema와 MCP/action IO |
| `packages/core` | `executeAction`, enforcement, port interface |
| `packages/adapter-supabase` | Drizzle schema, port implementation, commit transaction |
| `apps/web` | Gate, Log, Catalog read-only console |
| `apps/mcp` | MCP tools, `execute_action` |

### 필요한 확장

| 영역 | 확장 |
| --- | --- |
| contracts | meta action input schemas, catalog schemas, new effect schemas |
| core | catalog mutation enforcement, new port read methods, gate policy |
| adapter | catalog effect application, list catalog entries, transaction tests |
| web | Studio routes/forms, validation/result UI, catalog changes projection |
| mcp | meta action contracts exposed through existing `execute_action` |
| e2e | Studio and MCP catalog proposal flows |

## 4. 도메인 모델

### Runtime Plane

Runtime Plane은 실제 node/edge instance와 action execution을 다룬다.

- create/update node
- create/update edge
- approve gate
- action log

### Control Plane

Control Plane은 runtime의 의미론을 구성한다.

- node catalog
- edge catalog
- property catalog
- action catalog
- instruction catalog
- archetype catalog

Control Plane도 write는 `executeAction()`으로 수렴한다.

## 5. 타입별 메타 액션 목록

### Phase 2 우선순위

| 우선순위 | 액션 | 목적 |
| --- | --- | --- |
| P2.1 | `define_node_type` | Node Type 생성 |
| P2.1 | `update_node_type` | Node Type 수정 |
| P2.1 | `deprecate_node_type` | Node Type 비활성화 |
| P2.2 | `define_edge_type` | Edge Type 생성 |
| P2.2 | `update_edge_type` | Edge Type 수정 |
| P2.2 | `deprecate_edge_type` | Edge Type 비활성화 |
| P2.2 | `define_property` | Property 생성 |
| P2.2 | `update_property` | Property 수정 |
| P2.2 | `deprecate_property` | Property 비활성화 |
| P2.2 | `update_property_permission` | action-property permission 수정 |
| P2.3 | `define_action_contract` | Action Contract 생성 |
| P2.3 | `update_action_contract` | Action Contract 수정 |
| P2.3 | `deprecate_action_contract` | Action Contract 비활성화 |
| P2.4 | `define_instruction` | Instruction 생성 |
| P2.4 | `update_instruction` | Instruction 수정 |
| P2.4 | `deprecate_instruction` | Instruction 비활성화 |

### Naming rule

- create: `define_*`
- edit: `update_*`
- disable: `deprecate_*`
- permission mutation: `update_*_permission`

## 6. New contract schemas

### Catalog entry schemas

`packages/contracts`에 runtime과 studio가 공유할 catalog payload schema를 둔다.

```ts
export const NodeTypeDefinitionSchema = z.object({
  nodeType: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  contentMode: z.enum(["embedded_text", "external_url", "mixed"]),
  lifecyclePolicy: z.object({
    allowedStatuses: z.array(z.string()).min(1),
    initialStatus: z.string(),
    terminalStatuses: z.array(z.string()).default([])
  }),
  archetypeId: z.string().optional(),
  propertyKeys: z.array(z.string()).default([]),
  allowedActionTypes: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({})
});
```

### Meta action input schemas

```ts
export const DefineNodeTypeInputSchema = z.object({
  definition: NodeTypeDefinitionSchema,
  rationale: z.string().optional()
});

export const UpdateNodeTypeInputSchema = z.object({
  nodeType: z.string().min(1),
  patch: NodeTypeDefinitionPatchSchema,
  rationale: z.string().optional()
});

export const DeprecateNodeTypeInputSchema = z.object({
  nodeType: z.string().min(1),
  rationale: z.string().min(1),
  replacementNodeType: z.string().optional()
});
```

같은 패턴으로 Edge Type, Property, Action Contract, Instruction input schema를 추가한다.

### Effect schemas

기존 `EffectSchema`에 catalog effect kind를 추가한다.

```ts
export const CatalogEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("upsert_node_catalog_entry"),
    entry: NodeTypeDefinitionSchema
  }),
  z.object({
    kind: z.literal("deprecate_node_catalog_entry"),
    nodeType: z.string(),
    replacementNodeType: z.string().optional()
  }),
  z.object({
    kind: z.literal("upsert_edge_catalog_entry"),
    entry: EdgeTypeDefinitionSchema
  }),
  z.object({
    kind: z.literal("deprecate_edge_catalog_entry"),
    edgeType: z.string()
  }),
  z.object({
    kind: z.literal("upsert_property_catalog_entry"),
    entry: PropertyDefinitionSchema
  }),
  z.object({
    kind: z.literal("upsert_action_catalog_entry"),
    entry: ActionContractDefinitionSchema
  }),
  z.object({
    kind: z.literal("upsert_instruction"),
    entry: InstructionDefinitionSchema
  })
]);
```

## 7. Core design

### Port extensions

`CatalogPort` read methods를 확장한다.

```ts
interface CatalogPort {
  listNodeCatalogEntries(): Promise<NodeCatalogEntry[]>;
  getNodeCatalogEntry(nodeType: string): Promise<NodeCatalogEntry | null>;

  listEdgeCatalogEntries(): Promise<EdgeCatalogEntry[]>;
  getEdgeCatalogEntry(edgeType: string): Promise<EdgeCatalogEntry | null>;

  listPropertyCatalogEntries(): Promise<PropertyCatalogEntry[]>;
  getPropertyCatalogEntry(propertyKey: string): Promise<PropertyCatalogEntry | null>;

  listActionCatalogEntries(): Promise<ActionCatalogEntry[]>;
  getActionCatalogEntry(actionType: string): Promise<ActionCatalogEntry | null>;

  listInstructions(input?: InstructionListInput): Promise<Instruction[]>;
  findInstructions(...): Promise<Instruction[]>;

  listArchetypes(): Promise<Archetype[]>;
  getArchetype(archetypeId: string): Promise<Archetype | null>;
}
```

### Enforcement pipeline extension

기존 action 실행 흐름에 Catalog mutation 전용 검사를 추가한다.

```txt
parse execute input
  ↓
load action catalog entry
  ↓
validate action input schema
  ↓
check preconditions
  ↓
resolve effects
  ↓
enforce effects contract
  ↓
enforce catalog mutation integrity
  ↓
enforce executor/gate policy
  ↓
commit effects + log or create gate + log
```

### Catalog mutation integrity checks

#### Node Type

- node type name uniqueness
- reserved type name protection
- referenced archetype exists
- referenced properties exist
- referenced allowed actions exist
- lifecycle initial status is allowed
- terminal statuses are subset of allowed statuses

#### Edge Type

- edge type name uniqueness
- source node type exists
- target node type exists
- cardinality syntax valid
- breaking constraint change requires gate

#### Property

- property key uniqueness
- supported value type
- enum options non-empty when value type is enum
- bound node types exist
- incompatible type change requires gate or rejection

#### Action Contract

- action type uniqueness
- input schema is valid supported JSON schema subset
- effect templates only use supported effect kinds
- effect templates reference existing catalog entries
- action cannot grant itself unsafe catalog mutation rights without gate

#### Instruction

- scope references existing node type/action type when provided
- priority is within supported range
- content is non-empty

### Gate policy

Introduce a policy helper.

```ts
function requiresGateForAction(context: {
  actionType: string;
  executorType: ExecutorType;
  effects: Effect[];
  existingUsageImpact?: UsageImpact;
}): boolean
```

Default rules:

- Agent executor + any catalog effect => gate required
- Human executor + breaking catalog effect => gate required
- Human executor + non-breaking catalog create by admin => may commit directly
- `approve_gate` never creates another gate

### Action catalog bootstrap

Meta actions must exist before users can define actions. The initial meta action contracts are seeded/migrated as system bootstrap data.

Bootstrap is allowed only for initial catalog creation and migrations. Runtime Studio changes must use meta actions.

## 8. Adapter design

### Catalog effect application

`ActionCommitPort.commit()` already guarantees effects and log in one transaction. Extend `applyEffect` to support catalog effects.

```txt
commit()
  BEGIN
    for each effect:
      apply graph effect or catalog effect
    insert action log
    update gate decision if present
  COMMIT
```

### Tables affected

| Effect kind | Table |
| --- | --- |
| `upsert_node_catalog_entry` | `node_catalog` |
| `deprecate_node_catalog_entry` | `node_catalog` |
| `upsert_edge_catalog_entry` | `edge_catalog` |
| `deprecate_edge_catalog_entry` | `edge_catalog` |
| `upsert_property_catalog_entry` | `property_catalog` |
| `upsert_action_catalog_entry` | `action_catalog` |
| `upsert_instruction` | `instructions` |
| `update_property_permission` | `action_property_permissions` |

### Read model

Add list/get methods for all catalog tables. Web Studio should not import adapter internals; it should use port methods through app-level wiring.

### Transaction tests

Required integration tests:

- catalog effect and action log commit together
- catalog effect rolls back if action log insert fails
- duplicate node type rejection produces no catalog row and no committed log
- pending gate does not activate catalog entry until approval path commits effects

## 9. Web app design

### Routes

```txt
apps/web/app/studio/page.tsx
apps/web/app/studio/node-types/page.tsx
apps/web/app/studio/node-types/new/page.tsx
apps/web/app/studio/node-types/[nodeType]/page.tsx
apps/web/app/studio/node-types/[nodeType]/edit/page.tsx

apps/web/app/studio/edge-types/page.tsx
apps/web/app/studio/edge-types/new/page.tsx
apps/web/app/studio/edge-types/[edgeType]/page.tsx
apps/web/app/studio/edge-types/[edgeType]/edit/page.tsx

apps/web/app/studio/properties/page.tsx
apps/web/app/studio/properties/new/page.tsx
apps/web/app/studio/properties/[propertyKey]/page.tsx
apps/web/app/studio/properties/[propertyKey]/edit/page.tsx

apps/web/app/studio/actions/page.tsx
apps/web/app/studio/actions/new/page.tsx
apps/web/app/studio/actions/[actionType]/page.tsx
apps/web/app/studio/actions/[actionType]/edit/page.tsx
apps/web/app/studio/actions/[actionType]/preview/page.tsx

apps/web/app/studio/instructions/page.tsx
apps/web/app/studio/instructions/new/page.tsx
apps/web/app/studio/instructions/[instructionId]/page.tsx
apps/web/app/studio/instructions/[instructionId]/edit/page.tsx

apps/web/app/studio/archetypes/page.tsx
apps/web/app/studio/archetypes/[archetypeId]/page.tsx
apps/web/app/studio/catalog-changes/page.tsx
apps/web/app/studio/catalog-changes/[logId]/page.tsx
```

### Server actions

Use server actions as thin driving adapters.

```ts
export async function defineNodeTypeFormAction(formData: FormData) {
  const input = parseDefineNodeTypeForm(formData);

  return executeAction(getPorts(), {
    actionType: "define_node_type",
    executorType: "Human",
    input,
    idempotencyKey: ...
  });
}
```

Rules:

- no Drizzle writes in web route handlers
- no direct catalog CRUD in server actions
- parse external input with shared Zod schemas
- display `ExecuteActionResult` status directly

### UI components

Suggested components:

- `CatalogCard`
- `CatalogStatusBadge`
- `MetaActionResult`
- `ValidationSummary`
- `JsonAdvancedEditor`
- `EffectPreview`
- `GateLink`
- `ActionLogLink`
- `DiffViewer`
- `PropertyBindingTable`
- `ActionContractBuilder`

### UX states

All create/edit pages must handle:

- draft form state
- client validation errors
- server validation rejection
- gate created
- committed
- unexpected error

## 10. MCP design

The existing `execute_action` MCP tool remains the only write tool. Meta actions are exposed by adding action catalog entries and input schemas.

Recommended read tools:

- `list_node_types`
- `list_edge_types`
- `list_properties`
- `list_action_contracts`
- `get_action_contract`
- `find_instruction`
- `get_action_log`

MCP should not receive direct `create_node_type` or `update_action_contract` tools unless they are thin aliases over `execute_action`. Prefer teaching agents to call `execute_action` with the meta action type.

## 11. Gate approval model

### Current behavior to preserve

`approve_gate` is itself an action and must be logged.

### Phase 2 extension

Gate payload for catalog changes should include:

- target catalog
- operation
- target key
- before snapshot
- after snapshot
- rationale
- resolved effects
- impact summary

Approval commits the catalog effect if the original action was gated. Rejection records decision without applying catalog effect.

## 12. Catalog Change projection

Avoid creating a second audit SSOT. Use Action Log and Gate as the source, then derive a projection for UI.

```ts
type CatalogChangeView = {
  id: string;
  actionLogId: string;
  gateId?: string;
  actionType: string;
  targetCatalog: "node" | "edge" | "property" | "action" | "instruction";
  operation: "define" | "update" | "deprecate";
  targetKey: string;
  status: "committed" | "pending_gate" | "approved" | "rejected" | "failed";
  executorType: ExecutorType;
  executorId: string;
  rationale?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};
```

## 13. Testing strategy

### Core unit tests

For each meta action family:

- happy path resolves expected catalog effect
- duplicate key rejection
- missing referenced catalog rejection
- effect outside contract rejection
- Agent executor creates gate
- gate approval path applies effect

### Adapter integration tests

- catalog effects apply to correct tables
- commit atomicity with action log
- rollback on failure
- list/get catalog methods return active entries
- deprecated entries are filtered or flagged consistently

### Web tests

- Studio list pages render seeded catalog
- Node Type create form submits `define_node_type`
- rejection messages render
- pending gate result links to gate detail

### E2E tests

Minimum Phase 2 flow:

```txt
login as smoke user
  → open Studio Node Types
  → create Decision node type
  → observe gate or committed result
  → approve gate if required
  → confirm Decision appears in catalog
  → confirm action log contains define_node_type and approve_gate
```

MCP flow:

```txt
initialize MCP
  → execute_action define_node_type as Agent
  → receive pending gate
  → approve in web
  → list_node_types includes new type
```

## 14. Migration plan

### Step 1: Read ports

- Add list methods for all catalog types.
- Replace hardcoded action catalog reads in web.
- Add Studio read-only pages.

### Step 2: `define_node_type`

- Add schema.
- Seed action contract.
- Add catalog effect.
- Add core enforcement.
- Add adapter effect application.
- Add web form.
- Add tests.

### Step 3: Complete Node Type lifecycle

- `update_node_type`
- `deprecate_node_type`
- impact checks
- detail/edit pages

### Step 4: Edge and Property

- Repeat pattern for edge/property.
- Add property permission editor.

### Step 5: Action Contract

- Add contract schema editor.
- Add preview/dry-run.
- Add action contract meta actions.

### Step 6: Instruction and Graph Runner

- Add instruction meta actions.
- Add runtime action runner for node/edge instance creation.

## 15. Open decisions

1. Human admin direct commit policy: should admin catalog creates commit immediately or always require gate?
2. Catalog versioning: do we need explicit catalog version numbers in Phase 2, or is Action Log enough initially?
3. JSON schema subset: what schema features should Action Contract input support first?
4. Impact analysis depth: do we block breaking changes or route all breaking changes to gate?
5. Archetype mutation timing: include late Phase 2 or defer to Phase 3?

## 16. First implementation slice

The first implementation slice should be `define_node_type` end-to-end.

### Included

- Contracts for Node Type definition
- `define_node_type` action catalog seed
- `upsert_node_catalog_entry` effect
- Core integrity checks
- Agent executor gate behavior
- Adapter effect application
- Studio Node Type create form
- Action Log and Gate links
- Unit, integration, and e2e coverage

### Excluded

- Full Action Contract visual builder
- Archetype mutation
- Graph visualization
- Advanced RBAC editor

