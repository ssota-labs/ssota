# SWDL 시드 템플릿 × AX 스킬 — 고도화 가능성 분석

> 상태: analysis · 2026-07-09  
> 목적: `ssota-ax-author` 스킬의 환경 저작 루프(S1–S4)를 **코드 시드**(`SOFTWARE_DEV_TEMPLATE` / seed-pack)에 적용했을 때, 무엇을 고도화할 수 있는지 정리한다.  
> 범위: **분석만** — 구현·MCP 원격 저작·인스턴스 데이터 채우기는 후속.  
> 선행: [AX 개요](ax-program-overview.md) · [Task 2](ax-task2-swdl-seed-completion.md) · [WORKLOG](WORKLOG.md) · [page roadmap](../console/page-ui-catalog-roadmap.md)

---

## 0. 한 줄 결론

AX 스킬은 **빈 org에 MCP로 환경을 짓는 절차**다. SWDL 코드 시드는 이미 **리치한 L1 catalog + 44페이지 트리**를 갖고 있지만, 스킬이 요구하는 **품질 게이트·엣지 제약·워크플로우 에이전트/스케줄·스키마→페이지 매니페스트** 관점에서는 아직 “환경이 스스로 굴러가는 Domain Pack”이 아니다. 고도화는 MCP 재저작이 아니라 **같은 루프를 시드 파일에 기계적으로 적용**하는 일이다.

---

## 1. 두 경로의 대응 (MCP vs 코드 시드)

| AX 레이어 | 스킬이 하는 일 (MCP) | SWDL 코드 시드 SSOT | 적용 방식 |
|---|---|---|---|
| **S1 Catalog** | `create_node_type` / `create_edge_type` | `packages/contracts/src/catalog/node-types.ts` + `edge-types.ts` + seed-pack `edge-catalog.json` | TS Zod/메타 + JSON domain/range 보강 |
| **S2 Pages** | `create_page` + archetype/golden/review | `seed-packs/.../pages-tree.json` (44) | 슬라이스별 spec/bindings/actions + roadmap Δ |
| **S3 Agents** | `create_agent` (orchestrator+specialists) | `packages/contracts/src/agents/*` → `AGENT_DEFINITION_SEEDS` | SWDL 워크플로우 전용 정의 추가 (built-in 10종과 분리) |
| **S4 Schedules** | `create_schedule` | `scripts/seed/schedules.ts` (데모 2건 수준) | 오케스트레이터 cron을 템플릿 번들에 포함 |
| **Instances** | (환경 밖 — 나중에) | `graph-instances.json` = `[]` | 검증용 최소 샘플만 (선택) |

**템플릿 적용 경로:** `SOFTWARE_DEV_TEMPLATE` (`adapter-postgres/ports/templates.ts`) → `seedDomainCatalog` + `seedAgentDefinitions` + `seedPages`.  
페이지는 seed-pack JSON, 노드 타입은 contracts `NODE_TYPES`(39), 엣지 domain/range는 seed-pack `edge-catalog.json`(17, `agent_owns_page`는 코드 enum에만 있음).

**의도적 차이:** Task 2 문서의 “MCP로만 저작, 코드 시드 아님”은 **런타임 실증**용이다. 이번 작업은 그 실증에서 검증된 **방법론·패턴**을 **제품 기본 템플릿**에 되먹이는 코드 경로다.

---

## 2. 현재 SWDL 시드 스냅샷 (검증됨)

### 2.1 Catalog (S1)

| 항목 | 상태 | 메모 |
|---|---|---|
| Node types | **39** (`NODE_TYPES`) | Zod `propertySchema` 풍부. description/keywords는 메타에 있음 |
| Edge types | **18** 코드 enum / **17** seed JSON | seed에 `agent_owns_page` 없음 (inert 그래프 표현) |
| Edge domain/range | **약함** | 17개 중 **11개**가 `domainKeys`/`rangeKeys` 둘 다 `[]` — GRAPH-05 검증이 사실상 느슨 |
| Seed-pack `node-catalog.json` | **없음** | 노드는 contracts 코드가 SSOT; 엣지만 JSON 오버레이 |

**AX 스킬 대조 (실증 axswdl):** from-scratch는 **10 node + 10 edge**의 슬림 SDLC 체인(`roadmap→objective→initiative→prd→feature→story→task/sprint` + research/design). 제품 시드는 **더 넓고 깊음** — 문제는 폭이 아니라 **관계 제약·워크플로우 완결성**.

### 2.2 Pages (S2)

| 항목 | 상태 |
|---|---|
| 슬라이스 | **44** (허브 5 + L0 14 + initiative tpl 25) |
| bindings / actions | 32 / 29 페이지에 존재 |
| near-empty (`≤1` element) | **16** — 대부분 `PageHeader` 허브 (의도적 placeholder) |
| 컴포넌트 편향 | `Section`/`DocumentEditor`/`DocumentCardListSheet` 중심. AX golden의 `StatRow`/`ApprovalInbox`/`KanbanBoard`/`CalendarView` 거의 없음 (`Gantt` 1, `DataTable` 10) |
| Roadmap Δ | [page-ui-catalog-roadmap.md](../console/page-ui-catalog-roadmap.md)에 **⏳ 10건** 이미 큐잉 |

### 2.3 Agents / Schedules (S3–S4)

| 항목 | 상태 (가정 갱신 2026-07-09) |
|---|---|
| 템플릿 에이전트 | **SWDL 도메인만** — Research / Planning / Delivery / QA + Orchestrator (`SWDL_AGENT_DEFINITION_SEEDS`). generic built-in specialists/workers는 템플릿에 **넣지 않음** |
| 플랫폼 Main | Domain Pack/`applyTemplate` **미시드**. Console chat만 seed.ts 플랫폼 경로 |
| `linkedWorkerAgentIds` | Orchestrator → 4 specialists |
| 스케줄 | Orchestrator만 `0 9 * * 1-5` + weekly Monday `0 10 * * 1` (Main heartbeat 없음) |
| AX 실증 (axswdl) | specialists 4 + orchestrator 1 + schedules 3 — **코드 시드에 반영 중** |

> **가정:** “built-in generic은 없다” = Domain Pack 시드 관점. 코드 레지스트리(`AGENT_DEFINITION_REGISTRY`)의 generic 정의는 플랫폼/레거시 참조용으로 남을 수 있으나 `SOFTWARE_DEV_TEMPLATE`은 이를 시드하지 않는다.

### 2.4 Instances

`graph-instances.json` = `[]`. AX 원칙상 환경≠인스턴스이므로 정상. 다만 페이지 empty-state·E2E·렌더 검증용 **최소 샘플**은 고도화 후반에 선택적으로 유용.

---

## 3. AX 루프를 시드에 대입한 갭 분석

### 3.1 Step 0 — 스키마 → 페이지 매니페스트 (스킬 `page-archetypes.md`)

스킬은 catalog를 읽고 **기계적으로** List/Detail/Board/Inbox/Dashboard를 도출한 뒤 prune한다. SWDL은 역사적으로 **영역 허브 + initiative 템플릿**으로 자랐고, 스키마 신호→아키타입 매핑이 문서화되어 있지 않다.

| 스키마 신호 (AX) | SWDL 해당 타입 | 시드에 기대되는 표면 | 현재 |
|---|---|---|---|
| primary entity → List+Detail | `initiative`, `hypothesis`, `task`, … | List + `appliesToNodeType` Detail | initiative List+tpl ✅; 다수 타입은 DocumentSheet만 |
| `status`/`stage` enum → Board | `task`, `hypothesis`, `doc_status`류 | Kanban / status board | **거의 없음** (tasks는 Table+Gantt) |
| date/start/end → Calendar/Gantt | `task`, `roadmap`, `sprint` | Timeline/Gantt | Gantt 1 (build/tasks) |
| pending/approval → Inbox | (명시적 approval 타입 없음) | ApprovalInbox / 검토 큐 | **없음** — 사람 승인 표면이 문서 편집에 흡수 |
| aggregatable → Dashboard | goals/KPI/roadmap | StatRow 홈 | executive는 Sheet/Table; Stat 대시보드 **약함** |
| config/reference → Settings | `design_theme`, toolchain | Form/Settings | TokenList/Editor 수준 |

**갭 요약:** 44페이지는 “커버리지”는 넓지만, AX가 말하는 **워크플로우 의사결정 표면(Inbox/Board) + 홈 Dashboard**가 약하다. Document-first Console과 AX golden(SaaS ops)의 제품 철학 차이를 인정하되, **승인·상태 전이·집계**가 필요한 슬라이스만 아키타입을 이식하는 것이 맞다.

### 3.2 S1 — Catalog 고도화 가능성

| 우선순위 | 항목 | 근거 | 리스크 |
|---|---|---|---|
| **P0** | `edge-catalog.json` domain/range 채우기 | AX: edge는 node 키를 참조; GRAPH-05가 동작하려면 비어 있으면 안 됨. `for_initiative`→`["initiative"]`, `specifies`/`spawns_story` SDLC 체인 등 | 기존 느슨한 인스턴스/테스트가 깨질 수 있음 → 마이그레이션·시드 정합 테스트 필수 |
| **P1** | 핵심 SDLC 체인 엣지 명시 | AX 실증 패턴: initiative↔prd/feature/story/task. 지금은 다수 엣지가 unconstrained | 과잉 제약 시 크로스-타입 링크 실패 |
| **P2** | description/keywords 검색 품질 | `search_catalog` / 에이전트 라우팅 품질 | 낮음 |
| **P3** | propertySchema trim vs enrich | 스킬: “중요한 필드만”. SWDL Zod는 이미 리치 — **줄이기보다** Board/Gantt용 date·status 필드 일관성 점검 | schema 변경은 contracts+adapter blast |
| **보류** | 타입 수 축소(39→10) | AX 실증은 슬림 카탈로그. 제품 Console은 39가 의도 | 축소는 제품 범위 축소 — 이번 고도화 비범위 |

### 3.3 S2 — Pages 고도화 가능성

스킬 품질 루프: **manifest → archetype → golden spec → 9-point review → render**.

이미 있는 로드맵 Δ(10)와 AX 게이트를 합치면:

| 티어 | 내용 | 예시 |
|---|---|---|
| **A. Roadmap Δ 소화** | 기존 ⏳ 10건 — 인프라·convention 이미 논의됨 | `executive/roadmap` Editor, ErdDiagram, FlowCanvas, overview 편집화 … |
| **B. AX review 게이트 일괄 적용** | 9-point를 시드 슬라이스에 기계 스캔 | primary action 1개, badge/date typing, orphan/`rowHref`, empty copy, status token 통일 |
| **C. 워크플로우 표면 추가/강화** | Document dump → decision surface | Research hypotheses **Board**; Manager **Inbox**(검토 대기 initiative/PRD); Executive **StatRow** 홈 |
| **D. Golden 정렬** | `PageHeader` no-op 인지 하에 Section 타이틀·empty CTA | 허브 12는 nav-only 유지 OK; 콘텐츠 페이지는 empty-first-run 카피 |

**비범위(지금):** 44페이지를 AX HR 스타일 4페이지로 축소. Console IA(5영역+initiative tpl)는 제품 자산.

**권장 순서:** A(로드맵) → B(게이트 자동화/체크리스트) → C(의사결정 표면 2–3개) — C는 새 페이지보다 **기존 slug의 hero 교체**가 안전.

### 3.4 S3 — Agents 고도화 가능성

| 가정 | 적용 |
|---|---|
| generic built-in 없음 | 템플릿은 `SWDL_AGENT_DEFINITION_SEEDS`만 시드 |
| Main | Domain Pack 경로에서 **완전 제거**; 플랫폼 chat은 seed 밖 |
| orchestrator 패턴 | 1 orchestrator + 4 specialists + `linkedWorkerAgentIds` |
| playbook 품질 | body가 catalogKey·page slug를 명시 (AX 규칙) |

**상태:** U4 착수 — SWDL agents + schedules가 템플릿에 연결됨. 추가 고도화는 playbook 정교화·nodeScopes·영역별 세분화.

### 3.5 S4 — Schedules 고도화 가능성

| 현재 | 갭 | 적용안 |
|---|---|---|
| 데모 schedule fixture | 템플릿 적용 시 워크플로우 cron 없음 | orchestrator에 `0 9 * * 1-5` 등 + timezone `Asia/Seoul` |
| heartbeat 실발화 | 런타임/배포 관심사 | 시드는 **정의만**; 발화 검증은 E2E/통합 후속 |

스킬 규칙: **오케스트레이터만 스케줄**, specialist는 `task` (+ 독립 주기만 예외).

---

## 4. AX 실증(axswdl)에서 가져올 “패턴” vs 가져오지 말 것

WORKLOG: 빈 에이전트가 axswdl에 **catalog 10+10, pages 6, agents 5, schedules 3** 저작.

| 가져올 것 (방법·패턴) | 가져오지 말 것 |
|---|---|
| SDLC 체인 엣지 제약의 명확성 | 39→10 타입 축소 |
| initiative **subject + traverse** 드릴인 | 6페이지로 IA 축소 |
| orchestrator→specialist→schedule 수직 컷 | MCP 런타임 row를 그대로 dump |
| page review / typed columns / approve actions | HR golden을 SWDL에 무비판 복붙 |
| progressive disclosure 문서화 습관 | 인스턴스 대량 시드 |

즉 **캡처 대상은 Domain Pack의 “운영 레이어 + 관계 정합 + 페이지 품질”**이지, 실증용 슬림 카탈로그 전체가 아니다.

---

## 5. 고도화 로드맵 (구현 시 제안 슬라이스)

코드 변경은 이 문서 범위 밖. 착수 시 권장 수직 컷:

| 슬라이스 | 산출물 | 검증 | 의존 |
|---|---|---|---|
| **U1** Edge domain/range 정합 | `edge-catalog.json` (+ 필요 시 EDGE 메타) | contracts/adapter catalog 테스트, GRAPH-05 거부 케이스 | 없음 |
| **U2** Page review 패스 | 체크리스트 스크립트 또는 수동 게이트 + 우선 5 slug 수정 | `pnpm test --filter @ssota/contracts`, 관련 e2e | U1 권장 |
| **U3** Roadmap Δ 상위 3 | `executive/roadmap`, data-model/system-model 중 합의분 | e2e + [PR-03] | page-runtime 컴포넌트 존재 여부 |
| **U4** SWDL agents | contracts agents에 orchestrator+specialists | agent seed 테스트, spawn_task 스모크 | U1–U2 (playbook이 페이지/타입 참조) |
| **U5** Schedules in template | `SOFTWARE_DEV_TEMPLATE` 또는 seed hook에 cron | schedule port 통합 테스트 | U4 |
| **U6** (선택) 최소 graph instances | empty-state 대비 샘플 노드/엣지 | e2e 안정화 | U1 |

한 PR = 한 슬라이스 (AGENTS.md 기능별 PR 분리).

---

## 6. 리스크·제약

1. **철학 충돌:** Console은 Document/Artifact 중심; AX golden은 SaaS ops(Stat/Inbox/Kanban). 전면 교체 금지 — **의사결정이 있는 면만** 이식.
2. **엣지 강화 blast:** domain/range를 채우면 기존 느슨한 링크·테스트 실패 가능 → 거부 케이스와 함께 수정 ([TEST-01]).
3. **에이전트 시드 ≠ 메인 대체:** 메인/built-in 유지; SWDL 운영 레이어는 추가.
4. **Task 2와의 관계:** 런타임 MCP 실증은 완료(WORKLOG). 이 문서는 **그 학습을 코드 템플릿에 환류**하는 별 트랙.
5. **인스턴스 유혹:** 환경을 채우려다 시드에 실데이터를 넣지 말 것. 샘플은 검증용 최소만.

---

## 7. 성공 기준 (고도화 완료 시)

- [ ] 핵심 SWDL 엣지에 domain/range가 채워지고, 잘못된 링크는 API에서 reject
- [ ] 콘텐츠 페이지가 AX review 게이트(아키타입·primary action·typed data·empty·nav)를 통과 (허브 placeholder 제외)
- [ ] SWDL orchestrator + 영역 specialists가 템플릿 적용 시 시드되고, playbook이 catalog/page를 참조
- [ ] orchestrator에 평일 cron이 붙어 “환경이 스스로 도는” 정의가 템플릿에 존재
- [ ] page roadmap Δ의 합의분이 시드에 반영되고 E2E/[PR-03] 증거 있음

---

## 8. 다음에 할 일 (이 분석 직후)

1. 이 문서 기준으로 **U1 vs U4 중 첫 슬라이스** 선택 (관계 정합 vs 운영 레이어 — 제품 우선순위에 따름).
2. U1 착수 시: 엣지별 의도 domain/range 표를 한 장으로 확정한 뒤 `edge-catalog.json`만 수정하는 PR.
3. U4 착수 시: axswdl 실증 에이전트 구성을 참고하되, **39타입 Console IA**에 맞게 playbook·페이지 slug를 재작성.

---

## 부록 A — 시드 파일 맵

```text
packages/contracts/
  src/catalog/node-types.ts          # L1 node SSOT (39)
  src/catalog/edge-types.ts          # L1 edge enum + labels (18)
  src/agents/*                       # built-in agent seeds
  seed-packs/software-development-workflow/
    edge-catalog.json                # domain/range overlay (17)
    pages-tree.json                  # 44 page specs
    graph-instances.json             # [] 

packages/adapter-postgres/
  src/ports/templates.ts             # SOFTWARE_DEV_TEMPLATE apply
  src/ports/db-catalog-read-port.ts  # seedDomainCatalog
  src/scripts/seed/schedules.ts      # demo schedules
```

## 부록 B — AX 스킬 체크리스트 → 시드 질문

| 스킬 질문 | 시드에 던질 질문 |
|---|---|
| Reuse before create? | 새 타입 추가 전 `NODE_TYPES`/`search` 동의어 확인 |
| Node before edge? | edge JSON이 참조하는 키가 모두 node에 있는가 |
| Archetype named? | 각 pages-tree 슬라이스의 아키타입은? |
| One primary action? | `variant:default` / `addAction` 개수 ≤ 1 |
| No raw data? | status→badge, date→date, money→currency |
| Not orphan? | parentKey + rowHref / nav |
| Decision surface? | 승인·상태 전이 action 있는가 |
| Agent has trigger? | allowedTriggers 비어 있지 않은 |
| Schedule orchestrator only? | specialist에 불필요한 cron이 없는가 |
