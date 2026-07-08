# SSOTA, Template, Studio Seed perspective

> 상태: draft · 2026-07-08  
> 목적: SSOTA의 현재 `json-render` 구조, 내부 `Template`, 외부형 `Studio Seed`가
> 어떤 점에서 같고 다른지 정리한다. 실행 계획보다 관점 정리에 집중한다.

## 1. 요약

SSOTA, Template, Studio Seed는 모두 "에이전트가 조합 가능한 작업 환경을 만든다"는
같은 문제를 다른 실행 위치에서 푼다.

- **SSOTA json-render**는 플랫폼 안에서 실행되는 in-platform studio runtime이다.
- **Template**은 SSOTA 내부 데이터 모델, 페이지, 에이전트를 복제하는 내부형 seed다.
- **Studio Seed**는 Vite/React 같은 외부 앱을 생성하고 필요하면 SSOTA에 연결하는 외부형 seed다.

따라서 세 개는 대체 관계가 아니라 층위가 다르다.

```text
SSOTA platform
├─ json-render runtime     # 플랫폼 안에서 UI catalog + bindings + actions 실행
├─ Template / Domain Pack  # 내부 데이터·페이지·에이전트 초기 상태 복제
└─ external Studio Seed    # 필요할 때 iframe/widget/MCP로 연결되는 외부 앱 seed
```

## 2. SSOTA json-render의 성격

SSOTA의 `json-render`는 단순한 page builder가 아니다. 페이지는 `spec`, `bindings`,
`actions`를 함께 가진다.

- `spec`: UI catalog 컴포넌트를 배치하는 element tree
- `bindings`: graph nodes/edges에서 데이터를 읽는 선언
- `actions`: 서버가 실행하는 graph mutation 선언

이 구조는 Notion AI가 Notion block을 조합하는 것과 닮았지만, Notion보다 데이터와 행동의
결합이 훨씬 강하다. `query`, `singleton`, `subject`, `traverse`, `url_selection`,
`artifact` 같은 binding이 있고, `create_node`, `update_node`, `set_node_property` 같은
action이 있다.

즉 SSOTA의 현재 UI는:

> **도메인 데이터 모델 위에 UI catalog를 배선하는 in-platform studio runtime**

에 가깝다.

## 3. Template의 성격

Template은 SSOTA 내부의 복제 가능한 시작점이다.

현재 template은 다음을 묶는다.

- node catalog
- edge catalog
- agent definitions
- page tree
- page specs / bindings / actions

그래서 Template은 "외부 앱을 만드는 seed"가 아니라, SSOTA 내부 workspace를 특정 도메인에
맞게 초기화하는 bundle이다.

```text
Template
├─ data model catalog
├─ page specs
├─ agent definitions
├─ skills / instructions
└─ seed data or examples
```

Studio Seed와 비교하면 Template은 더 좁지만, 데이터 결합은 더 강하다.

> **Template은 SSOTA 안에서 동작하는 내부형 seed다.**

## 4. Studio Seed의 성격

Studio Seed는 독립 앱을 발아시키는 외부형 seed다.

Studio Seed는 보통 다음을 포함한다.

- template code
- studio runtime
- agent skills
- verification harness
- publish/deploy contract
- license or entitlement boundary

이 방식은 WebGL, Canvas, simulation, custom renderer, file export처럼 플랫폼 내부 UI catalog만으로
표현하기 어려운 도메인에 강하다.

반면 약점도 분명하다.

- SSOTA 내부 graph data와 직접 결합되지 않는다.
- iframe, Widget, postMessage, MCP publish 같은 연결면이 필요하다.
- 권한, 테넌시, audit, workflow state를 별도 설계해야 한다.

> **Studio Seed는 플랫폼 밖에서 독립 앱을 만들고, 필요하면 SSOTA에 연결하는 외부형 studio runtime이다.**

## 5. 가장 큰 차이: 자유도 vs 데이터 결합

| 관점 | SSOTA json-render | Template | Studio Seed |
|---|---|---|---|
| 실행 위치 | SSOTA 플랫폼 내부 | SSOTA 플랫폼 내부 초기 상태 | 외부 repo/app |
| 핵심 단위 | page `spec` + `bindings` + `actions` | catalog + agents + pages bundle | code + runtime + skills + checks |
| 자유도 | UI catalog 범위 안에서 높음 | template 구성 범위 안에서 높음 | 앱 코드 수준에서 가장 높음 |
| 데이터 결합 | 가장 강함 | 강함 | 별도 연동 필요 |
| 배포 | 플랫폼 안에서 즉시 실행 | 플랫폼 안에 복제됨 | 별도 Vite/static deploy |
| 좋은 도메인 | 업무 SaaS, CRUD+, 문서, 승인, 계약, audit | 반복 가능한 도메인 workspace | WebGL, simulation, creative tool |
| 약점 | catalog 밖 표현에 제약 | 도메인 pack 추상화 필요 | 데이터/권한 연동 비용 |

핵심 trade-off는 다음이다.

```text
SSOTA json-render  = 낮은 배포 비용 + 높은 데이터 결합 + 제한된 renderer 자유도
External Seed      = 높은 renderer 자유도 + 독립 배포 + 높은 연동 비용
```

## 6. SSOTA는 노코드인가

겉으로는 노코드와 유사하다. UI catalog에서 컴포넌트를 고르고, JSON으로 배치하고,
bindings/actions로 동작을 연결한다.

하지만 일반 노코드와 다르게:

- 데이터 모델이 graph/catalog로 정의된다.
- page가 server-side binding resolution을 가진다.
- action은 서버가 authoritative하게 실행한다.
- agent가 catalog와 schema를 읽고 구조를 수정할 수 있다.
- `FlowCanvas`, `WireframeCanvas`, `ErdDiagram`, `ArtifactWorkbench` 같은 canvas/workbench
  컴포넌트가 이미 catalog에 들어갈 수 있다.

그래서 더 정확한 표현은:

> **SSOTA는 no-code builder라기보다, 에이전트가 조작하는 domain UI runtime이다.**

## 7. HR 계약서 도메인으로 본 관점

HR 채용계약서 도메인은 SSOTA 내부 Template / Domain Pack에 잘 맞는다.

데이터 모델:

- `candidate`
- `job_offer`
- `contract_template`
- `contract_instance`
- `signer`
- `signature_request`
- `signature_event`

UI catalog:

- `ContractTemplateEditor`
- `ContractPreview`
- `ClauseLibrary`
- `SignerPanel`
- `SignatureCanvas`
- `SigningAuditTrail`
- `OfferDataTable`

페이지:

- 후보자/오퍼 테이블
- 계약서 작성 workspace
- 계약서 preview + clause editor
- 서명 요청 상태
- end-user signing page
- audit trail

이 도메인은 Notion에서 하기 어렵다. 이유는 단순 문서가 아니라 preview, signature, audit,
server action, 권한, 상태 전이가 필요하기 때문이다. 반대로 SSOTA에서는 도메인 UI catalog와
actions를 추가하면 자연스럽게 들어온다.

## 8. 디자인/시뮬레이션 도메인으로 본 관점

디자인 스튜디오, shader, pixel art, 물리 시뮬레이션, 회로 실험 같은 도메인은 더 갈린다.

SSOTA 내부에서 가능한 부분:

- 작업 목록
- source data
- artifact library
- parameter metadata
- preview URL
- generated output registry
- 설명 문서와 audit

외부 Studio Seed가 더 나은 부분:

- WebGL/WebGPU renderer
- custom canvas performance tuning
- timeline/keyframe editor
- local file/video export
- simulation engine
- high-frequency pointer interaction

따라서 이런 도메인은 하이브리드가 자연스럽다.

```text
SSOTA 내부
├─ 도메인 데이터, 작업 상태, artifact, 승인, 설명
└─ Widget / iframe / artifact preview

외부 Studio Seed
├─ 고자유도 renderer
├─ controls panel
├─ export
└─ postMessage / MCP publish로 결과 환류
```

## 9. Domain Pack이라는 중간 개념

SSOTA와 Studio Seed를 연결하려면 `Domain Pack`이라는 중간 개념이 필요하다.

Domain Pack은 외부 앱 seed가 아니라, SSOTA 내부 도메인 workspace를 구성하는 묶음이다.

```text
Domain Pack
├─ node catalog
├─ edge catalog
├─ page specs
├─ bindings/actions
├─ domain UI catalog components
├─ agent definitions
├─ agent skills/instructions
├─ example data
└─ verification/e2e recipes
```

Domain Pack은 Template의 진화형이다. Template이 "복제 가능한 초기 상태"라면,
Domain Pack은 "에이전트가 이해하고 수정할 수 있는 도메인 작업 환경"이다.

## 10. 결론

SSOTA와 Studio Seed의 차이는 "무엇을 만들 수 있느냐"보다 "어디서 실행되고 무엇과 직접
결합되느냐"에 있다.

- 데이터, 권한, 승인, audit, 문서, workflow가 중요한 도메인은 SSOTA 내부 Domain Pack이 맞다.
- renderer 자유도, simulation, creative canvas, 독립 export가 중요한 도메인은 외부 Studio Seed가 맞다.
- Template은 SSOTA 내부에서 Domain Pack으로 진화해야 한다.
- 외부 Studio Seed는 SSOTA의 `Widget`, `ArtifactWorkbench`, MCP publish와 연결되는 확장 표면이 된다.

따라서 현재 SSOTA는 개발 워크플로우에만 갇힌 제품이 아니라, **도메인별 업무 스튜디오를
내부 json-render catalog로 설치하고 운영할 수 있는 플랫폼**으로 볼 수 있다. Studio Seed는
그 플랫폼 밖에서 더 높은 자유도가 필요할 때 쓰는 확장 모델이다.
