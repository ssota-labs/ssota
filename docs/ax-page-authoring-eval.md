# AX 페이지 저작 품질 레이어 — 성능 분석

> 2026-07-09 · 대상: `ssota-ax-author` 스킬 S2 품질 레이어(page-archetypes / page-golden-specs / page-review) · 방법: blank-context 서브에이전트가 스킬만 읽고 도메인 페이지 세트 저작 → 실제 `jsonRenderSpec` 스키마로 검증 + 지표 채점 + 자기-리뷰 반환 분석.

## 셋업

- **4개 런, 3개 도메인** (골든 스펙과 겹치지 않도록 전부 non-sales): 헬프데스크, 클리닉 예약, 편집 파이프라인.
- **A/B 컨트롤**: 헬프데스크는 품질 레이어 **있음(WITH)** vs **없음(CTRL, 원본 mechanics만)** 두 번 — 레이어 유무 델타 측정.
- 각 서브에이전트: S1 스키마(주어짐) → 페이지 세트 저작 → JSON 파일 → (WITH는) 9포인트 self-review 게이트 실행.
- 채점: 각 페이지를 실제 contracts 스키마·컴포넌트 키·바인딩/액션 참조로 검증 + hero 다양성 / table-wall / 시맨틱 매핑 위반 / primary action / nav 지표.

## 스코어보드 (objective)

| 런 | pages | valid | distinct heroes | table-wall | 시맨틱 위반 | nav(parentId) | 종합 |
|---|---|---|---|---|---|---|---|
| 헬프데스크 **WITH** | 6 | **6/6** | 5 | 2/6 | 0 | 5/6 | ★ 강 |
| 헬프데스크 **CTRL** | 8 | **7/8** | 5 | 3/8 | 0 | 5/8 | 양호(1 broken) |
| 클리닉 WITH | 6 | **6/6** | 5 | 2/6 | 0 | 5/6 | ★ 우수 |
| 편집 WITH | 6 | **6/6** | 5 | 2/6 | 0 | 5/6 | ★ 우수 |

- **유효성**: WITH 3런 전부 100%(18/18). CTRL만 7/8 — `assignAgent`의 `create_edge`가 스키마 검증 실패(컨트롤 스스로 "확신 없는 관례"라 표기했으나 그대로 제출). **레이어가 잡는 가장 명확한 측정 델타 = 정합성.**
- **아키타입 다양성**: 네 런 모두 5개 distinct hero, table-wall ≤38% — **테이블 벽 없음**. WITH·CTRL 공통. → 이건 레이어가 아니라 **업그레이드된 컴포넌트 카탈로그(wave-1/2)의 리치 descriptor**가 만든 것(아래).
- **시맨틱 매핑**: 전 런 위반 0 — status→badge, date→date, number→number를 다 지킴(역시 descriptor + 유능한 에이전트).

## A/B — 헬프데스크 WITH vs CTRL

| | WITH | CTRL |
|---|---|---|
| 페이지 | 6 (Dashboard·List·Board·Detail·SLA·Macros) | 8 (+Customers·Customer·Team, Queue에 Kanban+Table 탭) |
| 유효성 | 6/6 | **7/8** — Ticket 페이지의 `assignAgent` 액션 무효 |
| 페이지 구성 | Step-0 매니페스트로 **coherent minimal set** | 커버리지 넓지만 중복(고객 2페이지) + 무효 액션 1 |
| primary action | 페이지별 1개 원칙 준수(Board/Detail은 drag/inline로 justified) | 8중 3페이지 primary 불명확 |
| 자기 검증 | 9포인트 게이트 + 페이지별 "결함 3개 발견·수정" | 없음 — 불확실한 액션을 그대로 제출 |

→ 같은 도메인·같은 스키마에서, **레이어는 "더 예쁜 페이지"가 아니라 "유효하고 일관되며 응집된 최소 세트"를 만든다.** 컨트롤은 더 많이 만들되 하나가 깨졌고 검증 습관이 없었다.

## 품질 레이어가 실제로 더한 것 (self-review 로그 근거)

WITH 런의 self-review 게이트가 **출시 전에 잡아 고친** 실제 결함들(도메인 무관하게 반복 등장):

1. **enum 정합성 버그 (반복)** — 클리닉·편집 둘 다: "ApprovalInbox는 `approved/rejected`를 dispatch하는데 이건 `intake_form.status`/`article.stage` enum에 없음 → [GRAPH-05] reject" → **Board로 교체하거나 고정 stage로 배선**해서 무효 enum이 절대 커밋되지 않게. (컨트롤은 유사한 무효 액션을 그대로 제출.)
2. **raw 데이터 차단** — "edge id를 컬럼으로 렌더할 뻔 → 드롭, relation으로", "`metaField:submittedAt`가 raw ISO 렌더 → 제거", "dob를 raw로 렌더할 뻔 → `type:date`".
3. **filter 한계 인지** — "'오늘 예약' 타일은 `filter`가 date range를 지원 안 함(eq/neq/exists뿐) → 계산 가능한 status 카운트로 교체".
4. **primary action 위계** — "동급 stage 버튼 3개 = primary 불명확 → '리뷰 요청' default, 나머지 secondary/outline".
5. **정직한 affordance** — "선택 클릭으로 detail 열고 싶지만 **navigation 액션 kind가 없음** → dead click 안 넣고 url_selection만; 예약은 sibling Form으로". 가짜 버튼을 만들지 않음.
6. **응집·오펀 제거** — "revision은 leaf → 별도 페이지 대신 Detail의 수정이력 relation으로 접기".

즉 레이어의 ROI는 **정합성(correctness) + 규율(consistency) + 응집(coherence)**이고, 그 대부분이 **④ self-review 게이트의 "결함 3개" adversarial 패스**에서 나왔다(예측대로 ④는 기준의 승수).

## 부가 소득 — 테스트가 스킬 자체의 결함을 잡음

- **골든 스펙의 무효 prop**: 헬프데스크 WITH가 "golden List의 `searchColumn`은 DataTable 실 prop이 아님(검색은 built-in faceted) → 드롭"이라 보고. impl·descriptor 모두 미지원 확인 → **내가 출시한 골든 스펙의 실제 결함을 blank-context 에이전트가 잡음** (수정 커밋 완료). 테스트 방법의 가치를 실증. 교훈: `jsonRenderSpec`은 임의 prop을 허용하므로 골든 스펙 검증은 **prop을 descriptor와 대조**해야 이런 누수를 막는다.
- **아키타입을 "안 쓰는" 판단도 정확**: 헬프데스크 WITH는 "help desk엔 approval edge가 없으니 `ApprovalInbox` 강제는 안티패턴"이라며 Inbox를 **의도적으로 배제**. 스키마 신호가 없을 때 억지로 끼워맞추지 않는 것도 아키타입 규율의 일부 — 정확히 작동.

## 컴포넌트 카탈로그가 이미 준 것 (materials vs patterns)

중요한 발견: **컨트롤(레이어 없음)도 5개 hero·table-wall 없음·시맨틱 위반 0**을 달성했다. 이유는 wave-1/2에서 올린 **리치 descriptor**가 아키타입을 암묵적으로 가르치기 때문 — "KanbanBoard: status-column board…", "RecordView: the Detail archetype…", "StatTile: KPI…". 유능한 에이전트는 descriptor만 읽어도 올바른 hero를 고른다.

→ **재료(컴포넌트 카탈로그)가 시각·구조 품질의 대부분을 실어나른다.** 패턴 레이어(아키타입/골든/게이트)의 한계 기여는 그 위에서 **정합성·규율·응집**을 보장하는 것 — "맞아 보인다"를 "실제로 맞고 유효하게 출시된다"로 바꾼다.

## 테스트가 드러낸 제품 갭 (component 피드백)

세 WITH 런이 공통으로 지목 — 다음 컴포넌트 개선 후보:

- **ApprovalInbox의 approve/reject 값 하드코딩** (`approved`/`rejected`). 도메인 enum이 다르면 GRAPH-05 위반. → **`approveValue`/`rejectValue` prop**로 목표 status를 지정 가능하게.
- **navigation 액션 kind 부재** — Board 카드·Calendar 이벤트 클릭으로 detail을 열 수 없음(그래프 mutation 액션만 존재). → `navigate`/`open` 액션 or `rowHref` 계열을 hero에도.
- **empty-state 커스터마이즈 불가** — `NodeTable`/`NodeList`만 `emptyLabel` 노출; DataTable/Kanban/Calendar/ApprovalInbox는 built-in 기본만. → 공통 `emptyLabel`/`emptyAction` prop.
- **StatTile 링크 불가** — Dashboard 타일 → List 드릴다운을 nav 트리에 의존. → 타일 `href`.

## 결론 & 권고

- **레이어는 목표대로 작동한다** — non-sales·blank-context 3도메인에서 100% 유효 + 아키타입 정합 + 반복 correctness 버그를 출시 전 차단. A/B에서 컨트롤은 유효성·규율·응집 모두에서 뒤졌다.
- **레버리지 분해**: 시각·구조 품질 ≈ 컴포넌트 카탈로그(재료), 정합성·규율·응집 ≈ 품질 레이어(패턴). 둘은 **상보적·곱셈적**. 앞선 논의(② 즉시 ROI, ④ 강제 승수)와 일치.
- **다음**: (1) 위 4개 component 갭을 wave-3/폴리시에 반영(특히 ApprovalInbox 값 지정 — 가장 자주 걸림), (2) 골든 스펙에 Calendar/Board/Detail 예시 1개씩 추가(현재 Dashboard/List/Inbox 3종 → 아키타입 커버리지↑), (3) self-review 게이트의 "결함 3개" adversarial 패스를 스킬에서 더 강조(버그 캐치의 주역).
