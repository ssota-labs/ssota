# Task 1 — AX 세팅 능력 구축 (MCP 환경-저작 툴 + AX 스킬)

> 상태: draft rev.2 · 2026-07-08 · 선행: [AX 프로그램 개요](ax-program-overview.md)
> rev.2 재작성 사유: 초안은 교정 이전(경로 A/B·graph-agent·코드시드·인스턴스 프로비저닝) 프레이밍. S0 baseline이 "현행 MCP로 환경 저작 불가"를 실증 → 진짜 과업 = **환경-저작 MCP 쓰기 표면 + 스킬**.

## 1. 목적

코딩 에이전트(유저의 Claude Code/Cursor/Codex)가 **MCP만으로 한 도메인의 "환경"(catalog·page·agent·schedule)을 저작**할 수 있게 만든다. 이를 위해:
1. **AX MCP 쓰기 표면** — 기존 DB 포트(node/edge_catalog·pages·agent_definitions·schedules)를 MCP 툴로 노출. (S0 baseline이 이게 없어 환경 저작이 0건이었음을 증명.)
2. **AX 스킬(Claude Code 플러그인)** — 그 툴을 이해하고 도메인을 분해→저작→검증하는 작업 계약.

둘을 **슬라이스(S1–S4)로 공진화**한다. 작업 도메인은 **HR 근태·휴가**(S0에서 시작한 것 이어서).

## 2. 핵심 원칙

- **MCP는 코어 use-case/포트 경유**로 쓴다([GRAPH-02]). apps/mcp 핸들러는 IO 변환만, 비즈니스 로직 X.
- **catalog는 org-scoped DB row**([GRAPH-01/04/05]) — 타입은 런타임 데이터. `create_node`/`edge`는 catalogKey를 **DB org catalog**로 검증(코드 enum 아님).
- **페이지는 json-render 조합만**([GRAPH-08]) — 도메인 전용 React 페이지 금지. 페이지 = `pages` 테이블 row(spec/bindings/actions).
- **에이전트는 `agent_definitions`만** — graph `agent` 노드 표현 안 씀.
- **reference on demand** — UI 카탈로그·property schema·binding/action 어휘는 progressive disclosure로 노출(목록→상세).
- **거부 케이스 테스트 필수**([TEST-01]) — 새 쓰기 툴마다 검증 실패 케이스.

## 3. 슬라이스별 산출 (각 = MCP 툴 + 스킬 + 서브에이전트 테스트 + 내 평가)

### S1 — Catalog (노드/엣지 타입)
- **MCP**: `create_node_type`(node_catalog upsert: key·label·description·keywords·propertySchema), `create_edge_type`(edge_catalog upsert: +domainCatalogKeys·rangeCatalogKeys). `create_node`/`create_edge` catalogKey enum 검증 완화(org DB catalog 키 허용). `list_node_types`/`list_edge_types`/`get_node_type`/`get_edge_type`를 **DB org catalog에서** 읽도록(현재 코드 enum — 불일치).
- **스킬**: 도메인 엔티티→노드 타입, 관계→엣지 타입(domain/range) 분해법 + property schema(JSON Schema) 작성법.
- **서브에이전트**: HR 타입(employee·leave_request·attendance_record…) + 엣지 타입 저작.
- **통과**: 새 타입 생성 → 그 타입으로 `create_node` 인스턴스까지.

### S2 — Pages (사람 승인 대시보드)
- **MCP(쓰기)**: `create_page`/`update_page`/`list_pages`(page-port: parentId·slug·appliesToNodeType·spec·bindings·actions·subjectNodeId).
- **MCP(읽기, progressive disclosure)**: `list_ui_components`(요약: key+description), `get_ui_component`(props·example·binding 요구), `list_binding_kinds`/`list_action_kinds`(어휘) — SSOT는 `packages/contracts/src/page/page-component-catalog.ts`(49 컴포넌트) + `page-runtime-schema.ts`.
- **스킬**: json-render 조합법(컴포넌트 목록→상세 로드→spec 배치→binding으로 데이터 배선→action으로 mutation). URL 선택은 `url_selection` binding.
- **서브에이전트**: HR 페이지(휴가 큐·잔여·정책) 저작.
- **통과**: 페이지가 DB에 생기고 **web preview에서 렌더**·바인딩·action 동작.
- **⚠️ 난이도 최고** — S2가 이 과업의 리스크 집중 지점.

### S3 — Agents (오케스트레이터 포함, 선택)
- **MCP**: `create_agent_definition`/`upsert_agent`(agent_definitions upsert: name·description·instructions(md→BlockNote)·toolBundles·nodeScopes·runPolicy). worker/skill 부착(`agent_definition_workers`/`agent_definition_skills`).
- **스킬**: 에이전트 정의법(instructions·tool_bundles·run_policy·allowedTriggers) + 오케스트레이터/스페셜리스트 구성(선호 패턴, 필수 아님).
- **서브에이전트**: HR 에이전트(접수·승인 라우팅…) + 선택적 오케스트레이터 저작.
- **통과**: `list_agents`에 뜨고 `spawn_task`로 배치 가능.

### S4 — Schedules + 자동 운영
- **MCP**: `create_schedule`/`list_schedules`(schedule port: agentDefinitionId·cronExpression·timezone·enabled).
- **스킬**: cron 케이던스 설계 + 오케스트레이터가 스케줄 거는 패턴.
- **서브에이전트**: HR 스케줄(일일 이상 스캔·월간 정산) 저작.
- **통과**: 스케줄 생성 → **heartbeat가 에이전트 run 발화** → 자동 운영 확인.

## 4. AX 스킬 (플러그인) 형태

- 기존 `plugins/ssota-plugin/`에 새 스킬 `skills/<ax-author>/`(SKILL.md + `references/*` progressive disclosure). 기존 `ssota-mcp`(연결/스코프) 위에 얹음.
- 미러 정합: `.cursor/plugins/local/`, `.agents/plugins/`, 스킬 정본 `.agents/skills/`+미러+`skills-lock.json`. `pnpm harness:mirrors` 그린.
- 이름 후보: `ssota-ax-author` / `ssota-domain-pack`.

## 5. 검증

- MCP 쓰기 툴마다: core use-case 단위 테스트(통과+거부) [TEST-01], adapter 통합.
- S2: `pnpm --filter web` preview로 페이지 렌더 검증([PR-03]).
- 슬라이스마다 서브에이전트(=유저 CC)가 스킬+MCP로 그 레이어 저작 → 내 평가 → 개정.
- 커밋 분리: contracts(스키마) → core(use-case) → adapter(port) → apps/mcp(툴) → 스킬, 기능별([GIT-01]).

## 6. 완료 정의(DoD)

- [ ] S1–S4 MCP 쓰기 툴 + progressive-disclosure read 툴 구현, 테스트 그린
- [ ] `create_node`/`edge` catalogKey·`list_*_types`가 DB org catalog 기준으로 정합
- [ ] AX 스킬(플러그인) 작성, 미러·lock 정합
- [ ] 빈 org(dev/ax-hr-sandbox)에서 서브에이전트가 스킬+MCP만으로 **HR 환경 S1–S4 전체를 저작**, web preview로 확인
- [ ] 각 슬라이스 평가 피드백이 스킬/MCP에 반영됨
