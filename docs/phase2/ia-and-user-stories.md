# LoopOS Phase 2 IA and User Stories

## 1. Phase 2 IA 목적

Phase 2의 웹은 단순 운영 콘솔이 아니라 LoopOS Studio다. 사용자는 Notion에서 DB를 만들듯이 Node Type, Edge Type, Property, Action Contract, Instruction을 설정하고, 설정 결과를 Runtime Catalog로 반영한다.

단, 모든 저장 동작은 타입별 메타 액션으로 수렴한다.

- 웹 사용자는 Studio UI를 통해 메타 액션을 실행한다.
- MCP 에이전트도 동일한 메타 액션을 실행한다.
- Runtime Graph 변경과 Catalog 변경은 모두 Action Log에 남는다.
- Agent executor가 수행한 Catalog 변경은 기본적으로 Gate 승인을 거친다.

## 2. 전체 정보 구조

```txt
/
├─ Dashboard
│
├─ Studio
│  ├─ Overview
│  ├─ Node Types
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail/Edit
│  ├─ Edge Types
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail/Edit
│  ├─ Properties
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail/Edit
│  ├─ Action Contracts
│  │  ├─ List
│  │  ├─ Create
│  │  ├─ Detail/Edit
│  │  └─ Test/Preview
│  ├─ Instructions
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail/Edit
│  ├─ Archetypes
│  │  ├─ List
│  │  └─ Detail
│  └─ Catalog Changes
│     ├─ Proposed
│     ├─ Approved
│     ├─ Rejected
│     └─ Change Detail
│
├─ Graph
│  ├─ Nodes
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail/Edit
│  ├─ Edges
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail
│  └─ Explorer
│
├─ Gates
│  ├─ Pending
│  ├─ Approved
│  ├─ Rejected
│  └─ Gate Detail
│
├─ Action Log
│  ├─ List
│  └─ Log Detail
│
└─ Settings
   ├─ Members
   ├─ Roles and Permissions
   └─ Environment
```

## 3. 글로벌 네비게이션

### Primary navigation

| 메뉴 | 목적 |
| --- | --- |
| Dashboard | 현재 runtime 상태, pending gate, 최근 action log 요약 |
| Studio | Catalog와 Action Contract를 설정하는 control plane |
| Graph | 실제 node/edge instance를 탐색하고 생성하는 runtime plane |
| Gates | 승인 대기열과 승인/반려 이력 |
| Action Log | 모든 action과 catalog change audit |
| Settings | 사용자, 역할, 환경 설정 |

### 공통 페이지 패턴

모든 Studio create/edit 화면은 다음 구조를 따른다.

1. Basic information
2. Structured builder
3. Advanced JSON view
4. Validation preview
5. Submit as meta action
6. Result: committed, pending gate, or rejected

## 4. Studio Overview

### 목적

LoopOS runtime을 구성하는 Catalog 상태를 한 화면에서 보여준다.

### 주요 요소

- Node Type count
- Edge Type count
- Property count
- Action Contract count
- Instruction count
- Pending catalog change count
- 최근 catalog change log
- "Create Node Type", "Create Edge Type", "Create Action Contract" quick actions

### 유저스토리

- 관리자로서, 현재 runtime에 어떤 primitive들이 정의되어 있는지 한눈에 보고 싶다.
- 관리자로서, 승인 대기 중인 catalog change가 있는지 빠르게 확인하고 싶다.
- 에이전트 운영자로서, 최근 catalog 변경이 어떤 action으로 발생했는지 추적하고 싶다.

### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Node Type 생성 시작 | 없음, form navigation |
| Edge Type 생성 시작 | 없음, form navigation |
| Pending change 보기 | read-only query |
| 최근 Action Log 보기 | read-only query |

## 5. Node Types

### List

#### 목적

Runtime Catalog에 등록된 Node Type을 탐색한다.

#### 주요 요소

- 검색
- lifecycle status filter
- archetype filter
- active/draft/deprecated filter
- node count
- allowed actions summary
- create button

#### 유저스토리

- 관리자로서, 현재 어떤 Node Type이 활성화되어 있는지 확인하고 싶다.
- 관리자로서, 특정 archetype을 사용하는 Node Type만 보고 싶다.
- 에이전트 운영자로서, agent가 생성 가능한 Node Type을 파악하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| 목록 조회 | 없음 |
| Node Type 상세 이동 | 없음 |
| Node Type 생성 | `define_node_type` |

### Create

#### 입력 항목

- `nodeType`
- display name
- description
- content mode: embedded text, external URL, mixed
- lifecycle policy
- archetype selection
- property bindings
- allowed actions
- rationale

#### 유저스토리

- 관리자로서, 새로운 의사결정 단위를 표현하기 위해 Node Type을 만들고 싶다.
- 에이전트로서, 현재 작업에 필요한 구조가 없을 때 새로운 Node Type을 제안하고 싶다.
- 승인자로서, agent가 제안한 Node Type이 runtime에 반영되기 전에 검토하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| 입력값 검증 | local validation + server validation |
| 생성 제출 | `define_node_type` |
| Agent 제안 승인 | `approve_gate` |
| 생성 반려 | `approve_gate` with rejection |

### Detail/Edit

#### 주요 요소

- 현재 active definition
- properties
- allowed actions
- linked edge types
- related nodes
- change history
- edit button
- deprecate button

#### 유저스토리

- 관리자로서, 특정 Node Type의 정의와 사용 현황을 함께 보고 싶다.
- 관리자로서, 기존 Node Type에 property를 추가하고 싶다.
- 관리자로서, 기존 데이터에 영향을 주는 변경인지 확인하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| 수정 제출 | `update_node_type` |
| 비활성화 제출 | `deprecate_node_type` |
| 관련 action log 조회 | 없음 |

## 6. Edge Types

### List

#### 목적

Node 사이의 허용된 관계 타입을 관리한다.

#### 주요 요소

- edge type name
- source node type
- target node type
- direction
- cardinality
- edge count
- active/deprecated status

#### 유저스토리

- 관리자로서, 어떤 Node Type끼리 연결될 수 있는지 확인하고 싶다.
- 에이전트 운영자로서, agent가 만들 수 있는 edge 범위를 파악하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Edge Type 생성 | `define_edge_type` |
| Edge Type 수정 | `update_edge_type` |
| Edge Type 비활성화 | `deprecate_edge_type` |

### Create/Edit

#### 입력 항목

- `edgeType`
- display name
- description
- source node type constraint
- target node type constraint
- directionality
- cardinality
- rationale

#### 유저스토리

- 관리자로서, `Project contains Task` 같은 관계를 정의하고 싶다.
- 에이전트로서, 현재 작업 그래프에 필요한 관계 타입을 제안하고 싶다.
- 승인자로서, 새 edge type이 기존 그래프 의미론을 훼손하지 않는지 검토하고 싶다.

## 7. Properties

### List

#### 목적

Node envelope에서 구조화할 수 있는 property catalog를 관리한다.

#### 주요 요소

- property key
- value type
- allowed node types
- required 여부
- enum options
- usage count
- permission summary

#### 유저스토리

- 관리자로서, runtime이 참조하는 구조화 필드 목록을 관리하고 싶다.
- 관리자로서, 어떤 action이 어떤 property를 변경할 수 있는지 보고 싶다.
- 에이전트 운영자로서, property가 content 의미를 과도하게 schema화하지 않는지 검토하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Property 생성 | `define_property` |
| Property 수정 | `update_property` |
| Property 비활성화 | `deprecate_property` |
| Permission 수정 | `update_property_permission` |

### Create/Edit

#### 입력 항목

- `propertyKey`
- display name
- value type
- validation options
- allowed values
- default value
- bound node types
- required policy
- rationale

#### 유저스토리

- 관리자로서, `status` property를 여러 Node Type에 재사용하고 싶다.
- 관리자로서, property type 변경이 기존 node에 미치는 영향을 확인하고 싶다.

## 8. Action Contracts

### List

#### 목적

Runtime에서 실행 가능한 action을 관리한다.

#### 주요 요소

- action type
- executor policy
- input schema summary
- preconditions summary
- allowed effects summary
- gate policy
- active/deprecated status

#### 유저스토리

- 관리자로서, agent가 실행할 수 있는 action 목록과 범위를 보고 싶다.
- 관리자로서, 특정 action이 어떤 effect를 만들 수 있는지 검토하고 싶다.
- 에이전트 운영자로서, MCP에 노출될 action contract를 확인하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Action Contract 생성 | `define_action_contract` |
| Action Contract 수정 | `update_action_contract` |
| Action Contract 비활성화 | `deprecate_action_contract` |
| Contract preview/test | dry-run validation |

### Create/Edit

#### 입력 항목

- `actionType`
- display name
- description
- executor policy
- input schema
- preconditions
- effect templates
- permission requirements
- gate policy
- rationale

#### 유저스토리

- 관리자로서, `create_decision` action을 정의하고 input과 effects를 제한하고 싶다.
- 에이전트로서, 반복되는 workflow를 action으로 제안하고 싶다.
- 승인자로서, 새 action이 과도한 write 권한을 갖지 않는지 검토하고 싶다.

### Test/Preview

#### 목적

Action Contract를 활성화하기 전에 sample input으로 resolved effects와 validation 결과를 확인한다.

#### 유저스토리

- 관리자로서, action이 실제로 어떤 node/edge/catalog effect를 만들지 미리 보고 싶다.
- 관리자로서, precondition 실패 메시지가 사용자에게 이해 가능한지 확인하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Sample input 검증 | dry-run only |
| Effect preview | dry-run only |
| Contract 저장 | `define_action_contract` or `update_action_contract` |

## 9. Instructions

### List

#### 목적

에이전트가 특정 node/action 상황에서 참고할 instruction을 관리한다.

#### 주요 요소

- title
- scope: global, node type, action type
- priority
- status
- updated at

#### 유저스토리

- 관리자로서, agent가 특정 action을 실행하기 전에 참고할 instruction을 등록하고 싶다.
- 에이전트 운영자로서, 어떤 instruction이 현재 MCP 도구 결과에 포함될 수 있는지 확인하고 싶다.

#### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Instruction 생성 | `define_instruction` |
| Instruction 수정 | `update_instruction` |
| Instruction 비활성화 | `deprecate_instruction` |

## 10. Archetypes

### 목적

Node Type과 gate policy가 참조하는 typical values, lifecycle expectation, deviation rule을 보여준다.

### Phase 2 범위

초기 Phase 2에서는 read-only를 기본으로 한다. Archetype 변경은 runtime 의미론에 미치는 영향이 크므로 Phase 2 후반 또는 Phase 3에서 타입별 메타 액션으로 확장한다.

### 유저스토리

- 관리자로서, Node Type이 연결된 archetype의 typical value 기준을 확인하고 싶다.
- 승인자로서, gate가 발생한 이유가 archetype deviation인지 확인하고 싶다.

## 11. Catalog Changes

### 목적

Catalog 변경을 action 단위로 추적하고 승인한다.

### 주요 요소

- change type
- target catalog
- operation
- proposed by
- executor type
- status: committed, pending_gate, approved, rejected
- diff
- validation result
- linked action log
- linked gate

### 유저스토리

- 승인자로서, agent가 제안한 catalog change diff를 보고 승인 여부를 결정하고 싶다.
- 관리자로서, 최근 어떤 catalog change가 runtime에 반영되었는지 추적하고 싶다.
- 에이전트 운영자로서, 반려된 change의 이유를 보고 instruction이나 action input을 개선하고 싶다.

### 주요 동작

| 동작 | 내부 액션 |
| --- | --- |
| Pending change 조회 | 없음 |
| 승인 | `approve_gate` |
| 반려 | `approve_gate` |
| Action Log 상세 이동 | 없음 |

## 12. Graph Nodes

### List

#### 목적

Runtime graph의 node instance를 탐색한다.

#### 주요 요소

- node type filter
- lifecycle status filter
- property filter
- text search
- create button

#### 유저스토리

- 사용자로서, 특정 Node Type의 instance를 목록으로 보고 싶다.
- 사용자로서, action으로 생성된 node의 현재 상태를 확인하고 싶다.

### Create

#### 동작 원칙

Node instance 생성도 직접 CRUD가 아니라 Action Contract를 통해 실행한다.

#### 유저스토리

- 사용자로서, `create_document` 같은 action을 폼으로 실행해 node를 만들고 싶다.
- 에이전트 운영자로서, 웹에서 가능한 node 생성 경로와 MCP action 경로가 동일하기를 원한다.

## 13. Graph Edges and Explorer

### 목적

Node 간 관계를 탐색하고 edge action을 실행한다.

### 유저스토리

- 사용자로서, 특정 node가 어떤 node를 참조하거나 포함하는지 보고 싶다.
- 사용자로서, 허용된 Edge Type만 선택해서 node를 연결하고 싶다.
- 에이전트 운영자로서, 잘못된 edge 생성 시 contract rejection이 명확하게 보이기를 원한다.

## 14. Gates

### 목적

Runtime action과 catalog meta action의 승인 대기열을 통합 관리한다.

### 유저스토리

- 승인자로서, pending gate를 action type, executor type, target catalog 기준으로 필터링하고 싶다.
- 승인자로서, catalog change의 diff와 rationale을 보고 승인하고 싶다.
- 승인자로서, 승인/반려도 action log에 남기를 원한다.

## 15. Action Log

### 목적

모든 runtime action과 meta action의 audit trail을 제공한다.

### 유저스토리

- 운영자로서, 특정 node나 catalog entry가 어떤 action으로 만들어졌는지 추적하고 싶다.
- 운영자로서, rejected action의 이유와 input을 확인하고 싶다.
- 운영자로서, agent가 수행한 catalog change 제안의 전체 흐름을 보고 싶다.

## 16. Settings

### Phase 2 범위

최소 범위는 read-only member/session 정보와 admin role guard다. 세밀한 RBAC 편집 UI는 Phase 2 후반으로 미룬다.

### 유저스토리

- 관리자로서, 누가 catalog meta action을 실행할 수 있는지 제한하고 싶다.
- 관리자로서, agent executor와 human executor의 권한 차이를 명확히 설정하고 싶다.

