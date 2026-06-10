# LoopOS Phase 2 PRD: Meta Action Studio

## 1. 요약

Phase 2는 LoopOS 웹 앱을 운영 콘솔에서 Meta Action Studio로 확장한다. 사용자는 웹에서 Node Type, Edge Type, Property, Action Contract, Instruction을 만들고 수정할 수 있다. 에이전트도 MCP를 통해 동일한 변경을 제안할 수 있다.

핵심 원칙은 다음과 같다.

1. Catalog 변경은 타입별 메타 액션으로 처리한다.
2. 웹은 Studio UI를 제공하지만 내부 쓰기는 `executeAction()`으로 수렴한다.
3. MCP 에이전트와 웹 사용자는 동일한 action contract를 사용한다.
4. Agent executor가 제안한 Catalog 변경은 기본적으로 Gate 승인을 거친다.
5. 모든 반영된 변경은 Action Log에 남는다.

## 2. 문제 정의

Phase 1은 seeded catalog 위에서 Runtime Graph를 운영하고 MCP로 action을 실행하는 기반을 제공한다. 그러나 catalog 자체는 코드와 seed에 고정되어 있어 사용자가 웹에서 다음 작업을 할 수 없다.

- 새로운 Node Type 정의
- 새로운 Edge Type 정의
- Property 추가와 node type binding
- Action Contract 정의
- Instruction 등록
- Catalog 변경 이력과 승인 흐름 관리

이 상태에서는 LoopOS가 "결정 공간 하네스의 Supabase"가 되기 어렵다. 사용자는 runtime을 직접 구성할 수 있어야 하고, 에이전트도 필요한 구조를 제안할 수 있어야 한다.

## 3. 목표

### 제품 목표

- 사용자가 웹에서 LoopOS primitive catalog를 설정할 수 있게 한다.
- Supabase Studio나 Notion DB builder처럼 접근 가능한 설정 경험을 제공한다.
- 설정 변경을 runtime action과 같은 audit/gate 체계 안에 포함한다.
- 에이전트가 catalog change를 제안하고 사람이 승인할 수 있는 자기수정 루프를 만든다.

### 시스템 목표

- 모든 catalog mutation을 타입별 메타 액션으로 표현한다.
- `executeAction()` 단일 쓰기 경로 원칙을 catalog mutation에도 적용한다.
- Catalog mutation effect와 Action Log를 단일 transaction으로 commit한다.
- Web, MCP, Core, Adapter가 같은 contract를 공유한다.

## 4. 비목표

Phase 2 초기 범위에서 제외한다.

- 자유로운 SQL/table builder 제공
- 완전한 visual graph layout editor
- 복잡한 multi-tenant billing/admin console
- 모든 action contract를 완전한 노코드 빌더로 표현
- Archetype mutation 전체 지원
- 기존 production data migration 자동화 UI
- 대규모 RBAC 정책 편집 UI

## 5. 사용자 유형

| 사용자 | 설명 | 주요 니즈 |
| --- | --- | --- |
| Admin Human | LoopOS runtime을 설계하고 승인하는 사람 | catalog 설정, gate 승인, audit 확인 |
| Operator | agent와 runtime 동작을 운영하는 사람 | action log, rejection, gate, instruction 확인 |
| Builder | node/edge/action 모델을 설계하는 사람 | node type, property, action contract 생성 |
| Agent Executor | MCP를 통해 action을 실행하는 에이전트 | catalog change 제안, rejection feedback, instruction 조회 |
| Approver | gate를 검토하는 사람 | diff, rationale, risk 확인 후 승인/반려 |

## 6. 핵심 사용자 여정

### 6.1 Human이 Node Type을 만든다

1. 사용자가 Studio > Node Types > Create로 이동한다.
2. 이름, 설명, content mode, lifecycle policy, archetype, properties를 입력한다.
3. Preview에서 validation 결과와 생성될 catalog effect를 본다.
4. Submit을 누른다.
5. 웹은 `define_node_type` action을 실행한다.
6. Human executor 정책에 따라 즉시 commit되거나 gate가 생성된다.
7. 사용자는 결과 화면에서 action log 또는 gate로 이동한다.

### 6.2 Agent가 Node Type을 제안한다

1. Agent가 MCP의 `execute_action`으로 `define_node_type`을 호출한다.
2. Core는 input contract와 catalog integrity를 검증한다.
3. Agent executor 정책에 따라 active catalog 직접 반영 대신 gate를 생성한다.
4. Approver가 웹 Gates 화면에서 diff와 rationale을 검토한다.
5. Approver가 `approve_gate`를 실행한다.
6. 승인 결과와 원래 제안은 모두 Action Log에 남는다.

### 6.3 Admin이 Action Contract를 정의한다

1. Studio > Action Contracts > Create로 이동한다.
2. action type, executor policy, input schema, preconditions, effect templates를 입력한다.
3. sample input으로 dry-run preview를 실행한다.
4. `define_action_contract`를 제출한다.
5. 승인 후 MCP와 Web Action Runner에 새 action이 노출된다.

### 6.4 Operator가 Catalog 변경 이력을 추적한다

1. Catalog Changes 또는 Action Log로 이동한다.
2. target catalog, action type, executor type으로 필터링한다.
3. 변경 diff, input, validation result, gate decision을 확인한다.
4. 문제가 있으면 후속 `update_*` 또는 `deprecate_*` meta action을 실행한다.

## 7. 기능 요구사항

### 7.1 Studio Overview

#### 요구사항

- Catalog primitive별 count를 보여준다.
- Pending catalog gates를 보여준다.
- 최근 catalog meta action log를 보여준다.
- 빠른 생성 버튼을 제공한다.

#### 수용 기준

- 사용자는 active Node Type, Edge Type, Property, Action Contract 수를 확인할 수 있다.
- 사용자는 pending catalog change로 이동할 수 있다.
- 사용자는 최근 catalog change의 action log로 이동할 수 있다.

### 7.2 Node Type Studio

#### 요구사항

- Node Type 목록 조회
- Node Type 생성
- Node Type 상세 조회
- Node Type 수정
- Node Type 비활성화
- property binding 관리
- allowed action 연결 보기

#### 타입별 메타 액션

- `define_node_type`
- `update_node_type`
- `deprecate_node_type`

#### 수용 기준

- 중복 node type은 거부된다.
- 참조한 archetype이 없으면 거부된다.
- 참조한 property가 없으면 거부된다.
- Agent executor의 생성/수정은 pending gate로 이동한다.
- 승인된 변경은 Action Log와 함께 commit된다.

### 7.3 Edge Type Studio

#### 요구사항

- Edge Type 목록 조회
- Edge Type 생성/수정/비활성화
- source/target node type constraint 설정
- directionality와 cardinality 설정

#### 타입별 메타 액션

- `define_edge_type`
- `update_edge_type`
- `deprecate_edge_type`

#### 수용 기준

- source/target node type이 존재하지 않으면 거부된다.
- 기존 edge instance가 있는 edge type의 breaking change는 gate가 필요하다.
- Agent executor의 변경은 pending gate로 이동한다.

### 7.4 Property Studio

#### 요구사항

- Property 목록 조회
- Property 생성/수정/비활성화
- value type과 validation option 설정
- node type binding 설정
- action-property permission 설정

#### 타입별 메타 액션

- `define_property`
- `update_property`
- `deprecate_property`
- `update_property_permission`

#### 수용 기준

- property key 중복은 거부된다.
- value type 변경이 기존 node property와 충돌하면 gate 또는 rejection으로 처리된다.
- runtime이 참조하지 않는 의미 정보는 content로 두도록 설명한다.

### 7.5 Action Contract Studio

#### 요구사항

- Action Contract 목록 조회
- Action Contract 생성/수정/비활성화
- input schema editor
- precondition builder
- effect template builder
- executor/gate policy 설정
- sample input dry-run preview

#### 타입별 메타 액션

- `define_action_contract`
- `update_action_contract`
- `deprecate_action_contract`

#### 수용 기준

- action type 중복은 거부된다.
- effect template이 지원하지 않는 effect kind를 사용하면 거부된다.
- contract가 선언한 allowed effects 밖의 변경은 실행 시 거부된다.
- action contract 변경은 변경 전/후 diff가 표시된다.

### 7.6 Instruction Studio

#### 요구사항

- Instruction 목록 조회
- Instruction 생성/수정/비활성화
- scope 설정: global, node type, action type
- priority 설정

#### 타입별 메타 액션

- `define_instruction`
- `update_instruction`
- `deprecate_instruction`

#### 수용 기준

- 존재하지 않는 node type/action type scope는 거부된다.
- Agent executor가 instruction을 변경하면 gate로 이동한다.
- MCP `find_instruction` 결과에 활성 instruction만 포함된다.

### 7.7 Catalog Changes

#### 요구사항

- Catalog meta action만 필터링해서 보여준다.
- proposed, pending, approved, rejected, committed 상태를 구분한다.
- target catalog와 operation을 표시한다.
- diff와 rationale을 표시한다.
- 연결된 gate와 action log를 제공한다.

#### 수용 기준

- 사용자는 agent가 제안한 catalog change를 한 화면에서 검토할 수 있다.
- 사용자는 승인/반려 후 결과 action log로 이동할 수 있다.

### 7.8 Graph Studio

#### 요구사항

- Node instance 목록/상세/생성
- Edge instance 목록/상세/생성
- Node detail에서 가능한 action 표시
- Action Runner를 통해 runtime action 실행

#### 수용 기준

- Node/Edge instance 변경은 catalog meta action이 아니라 runtime action으로 실행된다.
- 직접 CRUD route는 없다.
- contract rejection이 사용자에게 표시된다.

### 7.9 Gates

#### 요구사항

- Runtime action gate와 Catalog meta action gate를 통합 표시한다.
- Gate detail에서 action input, proposed effects, diff, rationale을 보여준다.
- 승인/반려는 `approve_gate`로 처리한다.

#### 수용 기준

- 승인/반려 결과가 Action Log에 남는다.
- Agent executor catalog change는 기본적으로 gate에서 확인 가능하다.

### 7.10 Action Log

#### 요구사항

- 모든 action log 목록 조회
- action type, executor type, target catalog, result status filter
- log detail에서 input, effects, gate decision, error reason 표시

#### 수용 기준

- 사용자는 catalog entry가 어떤 meta action으로 만들어졌는지 추적할 수 있다.
- 사용자는 rejected action의 reason code를 확인할 수 있다.

## 8. 권한과 정책

### Human executor

- Admin 권한이 있는 human만 catalog meta action을 제출할 수 있다.
- 조직 정책에 따라 즉시 commit 또는 gate required로 설정할 수 있다.

### Agent executor

- Agent는 catalog meta action을 제안할 수 있다.
- Agent가 제출한 catalog mutation은 기본적으로 gate required다.
- Agent가 `approve_gate`를 실행할 수 없다.

### System executor

- migration, seed, internal maintenance에서 제한적으로 사용한다.
- Phase 2 웹 UI에서는 노출하지 않는다.

## 9. 데이터와 감사 요구사항

### Action Log 필수 항목

- action type
- executor id
- executor type
- input
- resolved effects
- target catalog
- operation
- result status
- rejection reason
- gate id
- timestamp

### Catalog Change 표현

Catalog Change는 별도 UI 개념이지만, source of truth는 Action Log와 Gate다. 필요하면 read model/materialized projection으로 제공한다.

## 10. UX 원칙

1. 웹은 action execution UI처럼 보이지 않고 Studio처럼 보여야 한다.
2. 저장 버튼은 내부적으로 meta action을 실행한다.
3. rejection은 개발자 오류처럼 보이지 않고 수정 가능한 validation feedback으로 보여야 한다.
4. JSON editor는 advanced mode로 제공하고 기본 경로는 structured form이어야 한다.
5. 모든 dangerous change는 diff와 impact를 보여준다.
6. Agent proposal은 "자동 반영"이 아니라 "검토 가능한 제안"으로 보여준다.

## 11. 성공 지표

### 기능 성공 기준

- 웹에서 Node Type을 만들 수 있다.
- Agent가 Node Type을 제안하고 Human이 승인할 수 있다.
- 새 Node Type은 MCP와 Graph UI에서 사용할 수 있다.
- 모든 catalog change가 Action Log에 남는다.
- Catalog mutation direct CRUD route가 없다.

### 품질 성공 기준

- Core unit test에 catalog mutation rejection case가 포함된다.
- Adapter integration test가 catalog effect와 log의 transaction atomicity를 검증한다.
- Web typecheck가 통과한다.
- E2E에서 Studio create -> gate -> approve -> catalog visible 흐름이 통과한다.

## 12. 출시 단계

### P2.0 Read Model Studio

- Studio Overview
- Node/Edge/Property/Action/Instruction read-only list
- Catalog Changes read-only

### P2.1 Node Type end-to-end

- `define_node_type`
- `update_node_type`
- `deprecate_node_type`
- Web create/detail/edit
- Agent proposal -> gate -> approve

### P2.2 Edge Type and Property

- Edge Type meta actions
- Property meta actions
- Permission meta action
- Web builder UI

### P2.3 Action Contract Studio

- Action Contract meta actions
- input schema editor
- effect template preview
- dry-run validation

### P2.4 Instruction Studio and Graph Runner

- Instruction meta actions
- Graph node/edge creation via runtime actions
- Web action runner

### P2.5 Hardening

- full e2e coverage
- catalog impact analysis
- richer rejection UI
- role guard hardening

## 13. 주요 리스크

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| 메타 액션 과복잡도 | 모든 catalog 변경을 action으로 만들면 초기 구현량이 커진다 | `define_node_type`부터 end-to-end로 패턴 검증 |
| 자기수정 위험 | Agent가 runtime 의미론을 변경할 수 있다 | Agent executor는 gate required, diff/impact 표시 |
| Action Contract builder 난이도 | 완전한 노코드 빌더는 어렵다 | structured form + advanced JSON + preview로 시작 |
| Bootstrap 문제 | action을 만들기 위한 action이 필요하다 | seed/migration으로 core meta actions를 bootstrap하고 이후 변경은 meta action 사용 |
| Audit 중복 | Catalog Change Log와 Action Log가 분리될 수 있다 | Action Log를 SSOT로 두고 Catalog Changes는 projection으로 설계 |

