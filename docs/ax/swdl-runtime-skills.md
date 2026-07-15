# SWDL 런타임 스킬셋 (from scratch)

> 전제: 레포 `.agents/skills` 빌트인은 **개발용**이며 SWDL 시드 에이전트 런타임과 무관하다.  
> Main 에이전트는 없다. 대상은 Research / Planning / Delivery / QA / Direction / Design / Orchestrator **일곱** 명이다.  
> Progressive Disclosure: 에이전트는 **이름+description만** 상시 보고, 본문·references는 해당 작업에 들어갈 때만 연다.

---

## 1. 설계 원칙

| 원칙 | 의미 |
|------|------|
| **도메인만** | 스킬 = “이 teamspace 그래프에서 어떻게 일하는가”. 코딩 IDE·Notion MCP·shadcn 등은 넣지 않는다. |
| **얇은 SKILL.md** | frontmatter `description`(라우팅) + 언제 열고 / 어떤 ref를 읽을지 / 완료 조건. 장문 절차는 `references/`. |
| **공유 vs 전문** | 그래프·task 계약은 공유. 산출물 파이프라인은 역할당 1개. |
| **도구와 정합** | 현재 SWDL 에이전트 tool bundle = `graph.*` + `tasks.manage` (+ orchestrator `skills.read`). 스킬도 그 범위 안에서만. |
| **카탈로그 덤프 금지** | 39타입 전체를 SKILL에 넣지 않는다. 역할별 **작업 표면**(타입·엣지·페이지 키)만 ref에. |

레이어:

```
[항상] agent instruction (역할·완료 계약) + tool bundles
[목록] skill name + description 만 (라우팅)
[열면] SKILL.md 본문 (짧은 절차 + ref 포인터)
[필요 시] references/*.md (스키마·체크리스트·예시)
```

---

## 2. 스킬 인벤토리 (제안)

총 **10개**. 역할마다 전부 장착하지 않는다.

### 공유 (specialist 공통 3)

| id | description (라우팅용 한 줄) | SKILL.md에 둘 것 | references/ |
|----|------------------------------|------------------|-------------|
| `swdl-graph-ops` | Create/update/query SWDL graph nodes and edges with catalogKey, properties conventions, and org/teamspace scope. Use whenever reading or writing nodes/edges. | 조회→검증→쓰기 순서, 금지(직접 SQL 등), 실패 시 blocked | `catalog-surface.md`(역할별 포인터만), `edge-rules.md`, `properties-conventions.md` |
| `swdl-task-contract` | Drive the work-order lifecycle: get_task, status running/blocked/done, and what belongs in the completion summary. Use on every task start and finish. | 상태 머신, 요약에 넣을 node id 규칙 | `status-semantics.md`, `blocked-reasons.md` |
| `swdl-handoff` | Package outputs so the next SWDL specialist can continue without re-discovery. Use before marking done when another role will consume the result. | handoff 필드 최소셋 | `handoff-schema.md` (research→planning→delivery→qa→design 슬롯) |

### 전문 (역할당 1)

| id | owner | description | references/ |
|----|-------|-------------|-------------|
| `swdl-research-pipeline` | Research | Turn a research ask into `research` / `finding` / `insight` (and related) nodes linked to the initiative. Use for discovery, competitive, user, or market research work orders. | `types-and-edges.md`, `pages.md`, `quality-bar.md` |
| `swdl-planning-pipeline` | Planning | Turn insights/goals into `prd` / `user_story` / `feature` / roadmap structure under an initiative. Use for product planning and scope definition. | `types-and-edges.md`, `pages.md`, `splitting-rules.md` |
| `swdl-delivery-pipeline` | Delivery | Turn planned scope into `implementation_plan` / `task` / `pull_request` / sprint execution updates. Use for build, board, and PR tracking work orders. | `types-and-edges.md`, `pages.md`, `task-lifecycle.md` |
| `swdl-qa-pipeline` | QA | Turn delivery candidates into `test_plan` / `test_case` / `bug` / verification outcomes. Use for QA, regression, and acceptance work orders. | `types-and-edges.md`, `pages.md`, `severity-and-repro.md` |
| `swdl-direction-cycle` | Direction | Run Cycle A direction cadences — quarterly planning, weekly KPI review, roadmap rebalance. Use on Direction schedules or goal/KPI threads. | `catalog-surface.md`, `quarterly-planning.md`, `weekly-kpi.md`, `roadmap-rebalance.md`, `slack-playbook.md` |
| `swdl-design-pipeline` | Design | Cycle F — IA/flows, wireframes, design crit prep, design-system upkeep. Use for design work orders. | `types-and-edges.md`, `pages.md`, `crit-checklist.md`, `handoff-to-build.md` |

### 오케스트레이션 (1)

| id | owner | description | references/ |
|----|-------|-------------|-------------|
| `swdl-orchestrate` | Orchestrator | Triage open work orders and route to Research, Planning, Delivery, QA, or Design; keep schedule-driven sweeps honest. Use on every orchestrator run — do not perform specialist graph authoring yourself. | `routing-table.md`, `schedule-policy.md`, `escalation.md` |

Orchestrator는 **전문 파이프라인 스킬을 장착하지 않는다.** 라우팅 테이블만 알면 된다 (progressive: 상세 타입 스키마는 specialist가 연다). Direction은 schedule/chat 중심이라 Orchestrator가 일상 스폰하지 않는다.

---

## 3. 에이전트 × 스킬 매트릭스

| Agent | 장착 스킬 |
|-------|-----------|
| **Research** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-research-pipeline` |
| **Planning** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-planning-pipeline` |
| **Delivery** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-delivery-pipeline` |
| **QA** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-qa-pipeline` |
| **Direction** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-direction-cycle` |
| **Design** | `swdl-graph-ops`, `swdl-task-contract`, `swdl-handoff`, `swdl-design-pipeline` |
| **Orchestrator** | `swdl-task-contract`, `swdl-orchestrate` (+ 읽기 전용으로 graph 목록이 필요하면 `swdl-graph-ops`의 **query-only** 절만 — 쓰기는 스킬 description에서 금지) |

권장: Orchestrator의 `swdl-graph-ops`는 아예 빼고, `swdl-orchestrate` ref에 “목록 조회용 query 패턴”만 둔다. 쓰기는 specialist 전용.

## 4. 폴더 레이아웃 (시드에 둘 위치)

코드 SSOT 후보 (빌트인 `.agents/skills` 아님):

```
packages/contracts/src/agents/skills/swdl/
  swdl-graph-ops/
    SKILL.md
    references/
      edge-rules.md
      properties-conventions.md
  swdl-task-contract/
    SKILL.md
    references/
      status-semantics.md
      blocked-reasons.md
  swdl-handoff/
    SKILL.md
    references/
      handoff-schema.md
  swdl-research-pipeline/
    SKILL.md
    references/
      types-and-edges.md
      pages.md
      quality-bar.md
  swdl-planning-pipeline/
    ...
  swdl-delivery-pipeline/
    ...
  swdl-qa-pipeline/
    ...
  swdl-direction-cycle/
    ...
  swdl-design-pipeline/
    ...
  swdl-orchestrate/
    SKILL.md
    references/
      routing-table.md
      schedule-policy.md
      escalation.md
```

에이전트 시드의 `skills` / 계정 스킬 링크는 **위 id 목록만** 가리킨다. instruction md는 “역할 한 페이지”로 남기고, 절차는 스킬로 옮긴다 (instruction 비대화 방지).

---

## 5. SKILL.md 템플릿 (모든 스킬 동일 골격)

```markdown
---
name: swdl-delivery-pipeline
description: >-
  Turn planned scope into implementation_plan, task, pull_request, and sprint
  updates in the SWDL graph. Use for build execution, board triage, and PR
  tracking work orders — not for research or PRD authoring.
---

# Delivery pipeline

## Open when
- Task asks to create/advance build work under an initiative or release

## Do not use when
- Ask is discovery-only → research-pipeline
- Ask is PRD/story shaping only → planning-pipeline

## Procedure (summary)
1. Read `references/types-and-edges.md` for allowed catalogKeys and edges.
2. Read `references/pages.md` if updating human-visible boards.
3. Apply `references/task-lifecycle.md` for status transitions.
4. Finish via task-contract + handoff skills.

## Done when
- Board/query reflects new state; handoff lists node ids for QA or Planning
```

본문은 **1화면 이내**. 타입 표·엣지 제약·예시 JSON은 전부 references.

---

## 6. 파이프라인별 “작업 표면” (ref에만)

지금 카탈로그 기준으로 **스킬이 책임지는 최소 표면** (P0 스키마 보강 전제와 맞춤):

| Pipeline | Nodes (최소) | Edges (최소) | Pages (최소) |
|----------|--------------|--------------|--------------|
| Research | `research`, `finding`, `insight` (+ 필요 시 `interview` 등) | initiative 연결에 쓸 수 있는 기존/보강 엣지 | `tpl/initiative/research/*` |
| Planning | `prd`, `user_story`, `feature`, `initiative`(메타) | `for_initiative`, story↔feature | `tpl/initiative/planning/*`, roadmap |
| Delivery | `implementation_plan`, `task`, `pull_request`, `sprint` | `for_initiative`, `for_release`, `tracked_by`, (보강) `blocked_by` | build plan/tasks/PRs + **전역 보드(추가 예정)** |
| QA | `test_plan`, `test_case`, `bug` | 대상 story/task/PR 링크 | `tpl/initiative/build/qa`, test-* |
| Design | `page_wireframe`, `user_flow`, `information_architecture`, `ui_component`, `design_theme` | `for_initiative`, `informs`, `references`, `for_page` | `design/*`, `tpl/initiative/design/*` |
| Direction | `objective`, `key_result`, `kpi`, `product_roadmap`, `metric_snapshot` | `contributes_to`, `for_initiative` | `executive/goals`, roadmap |
| Orchestrate | (쓰기 없음) | — | — ; routing만 |

빈 `domain`/`range` 엣지·없는 페이지는 **스킬에 “있다고” 쓰지 않는다.** 카탈로그/페이지가 먼저 생기고 ref가 그걸 인용한다.

---

## 7. 명시적으로 넣지 않는 것

- 레포 빌트인 전부 (ssota-mcp, next-*, shadcn, playwright-*, …)
- “코드 구현 방법” 스킬 (SWDL Delivery는 그래프상 task/PR 추적; IDE 코딩 에이전트 대체 아님)
- 외부 SaaS 조작 스킬 (GitHub/Linear 연결은 Connect 도입 후 **별도** 스킬로 추가)
- 만능 `swdl-all-types` 백과사전 스킬

---

## 8. instruction vs skill 분업

| 남길 곳 | 내용 |
|---------|------|
| **Agent instruction** | 나는 누구인지, 성공/실패 정의, 다른 역할에 넘기지 말 것, 도구 bundle 전제 |
| **Skills** | 어떻게 그래프를 만지는지, 역할별 파이프라인, 라우팅 표 |
| **Schedules** | 언제 orchestrator/delivery sweep이 도는지 (스킬 아님) |

지금 `swdl.*.md` instruction에 들어 있는 “Steps / Catalog & pages”는 대부분 **해당 pipeline 스킬 + refs로 이전**하는 게 Progressive Disclosure에 맞다.

---

## 9. 구현 순서 (합의 후)

1. 공유 3 + orchestrate 1 스킬 스켈레톤 (`SKILL.md`만, refs stub)
2. 전문 6 pipeline/cycle 스킬 (Research/Planning/Delivery/QA/Direction/Design) — 현재 실제 존재하는 타입/페이지만 ref에 기입
3. 에이전트 시드에 skill id 연결 + instruction 슬림화
4. 카탈로그/페이지 P0 보강될 때마다 **ref만** 갱신 (SKILL description은 라우팅 안정성 위해 자주 안 바꿈)

---

## 관련

- [swdl-seed-upgrade-analysis.md](./swdl-seed-upgrade-analysis.md) — 환경(타입·페이지) 업그레이드
- 이 문서 — 그 환경 위에서 **에이전트가 쓰는 스킬**만
