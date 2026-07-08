# AX 프로그램 개요 — Agent Transformation Pack 저작을 클로드 코드 플러그인으로

> 상태: draft · 2026-07-08 (rev.2 — 프레이밍 확정)
> 목적: 오늘 진행하는 3개 과업의 **공통 배경·용어·시스템 사실관계·테스트 루프**를 한 곳에 모은다. 세 요구사항 문서는 이 문서를 참조한다.
> 관련: [Studio Seed Platform memo](../studio-seed-platform-memo.md), [SSOTA·Template·Studio Seed 관점](../ssota-template-studio-seed-perspective.md)

## 0. 한 줄 정의 (용어·목표 확정)

- **AX = Agent Transformation** ("회사를 에이전트 네이티브로 전환"; DX=Digital Transformation의 대응). ~~Agent Experience 아님.~~
- **AX 세팅** — 코딩 에이전트(Claude Code/Cursor/Codex)가 **MCP로 SSOTA의 "환경"을 바로바로 저작**하는 것. 환경 = **catalog(노드/엣지 타입) + 페이지 + 에이전트 + 스케줄 + 스킬**. **인스턴스(실데이터)는 대상이 아니다** — 인스턴스는 세팅된 환경 위에서 나중에(자동 운영 에이전트/유저가) 채운다.
- **Domain Pack** — 그 환경 세팅을 **반복 가능하게** 만든 것. AX 세팅이 즉석 저작이라면 Domain Pack은 그 재사용 패키지. **지금 테스트 초점은 AX 세팅**이고, 반복화(팩)·코드 템플릿 캡처는 **선택적 부산물/후속**.
- **에이전트 조직(선택)** — 환경에는 에이전트들(`agent_definitions`)이 포함된다. 자주 쓰는 패턴이 **오케스트레이터**(스케줄을 걸고 다른 에이전트에 작업을 배치하는 스페셜 에이전트)지만 **별도 타입이 아니고 필수도 아님** — 우리가 선호하는 구성이라 스킬이 이를 포함하도록 만들 뿐. 조직은 조직도처럼 중첩 가능.
- **메인 에이전트는 이 테스트의 대상이 아니다** — 메인은 플랫폼에서 유저가 직접 대화하는 창구로, 자동 운영 흐름과 **별개**(오케스트레이터와 소통 안 함). 여기서 테스트하는 건 유저가 **Claude Code/Cursor/Codex에서 우리 MCP로** 환경을 세팅하는 시나리오다.
- **이번 산출물** — 그 AX 세팅을 코딩 에이전트가 하도록 돕는 **Claude Code 플러그인**(SSOTA MCP + AX 저작 스킬). 환경 저작에 필요한 MCP 쓰기 툴(catalog/page/agent/schedule)은 **기존 DB 포트를 노출**해 함께 만든다.

## 1. 자동 운영 모델 (환경이 세팅하는 것)

```text
[별개] Main agent  ← 플랫폼에서 유저가 직접 대화하는 창구. 자동 흐름과 분리. 테스트 밖.

── 환경(AX 세팅의 대상) ─────────────────────────────
schedules(cron+heartbeat) ──발화──▶ 에이전트(agent_definitions) ──▶ pack 작업
                                          │                         └─▶ 사람 승인용 page
                                          └─ (선호 패턴) 오케스트레이터가 스케줄 걸고
                                             하위 에이전트에 spawn_task로 배치 · 조직도처럼 중첩
```

- **에이전트 = `agent_definitions`.** 한 환경에 여러 개 가능. "오케스트레이터/스페셜리스트"는 **역할 라벨일 뿐 별도 타입 아님.**
- **오케스트레이터(선호 패턴, 선택)** — 스케줄을 걸고 하위 에이전트에 작업을 배치하는 스페셜 에이전트. 중첩(오케스트레이터→하위 오케스트레이터/스페셜리스트) 가능. **없어도 되는 환경도 있다.**
- **자동 운영 흐름** — `schedules`(cron+heartbeat)가 에이전트 run을 발화 → 에이전트가 pack 작업 수행 → 산출물이 **사람 승인용 페이지**에 뜬다(human-in-the-loop). "환경이 실제로 굴러가는가"의 판정 기준.
- **메인 에이전트는 별개** — 유저 대화 창구. 자기 툴로 스케줄 등을 바꿀 수 있으나 자동 운영 흐름과 **분리**돼 있고 오케스트레이터와 소통하지 않는다. **이번 테스트 범위 밖.**
- **에이전트 스킬 = 폴더 + progressive disclosure** — 각 에이전트의 플레이북. 이미 `skill_snapshots.files[]` + `agent_definition_skills.lock`로 존재(§2). AX 저작 스킬(플러그인)도 동일 패턴.

## 2. 시스템 사실관계 (2026-07-08 worktree 기준 검증)

세 문서가 공유하는 "현재 실제 상태". 이번 세션 코드 확인.

### 2.1 팩의 모든 요소가 이미 DB 1급 테이블 (schema.ts = ground truth)

`packages/adapter-postgres/src/db/schema.ts` 직접 확인. **catalog도 코드가 아니라 DB 테이블**이다(이전 "catalog=코드" 서술은 틀림). 회사가 자동으로 굴러가는 데 필요한 것이 **전부 이미 DB에 있다**.

| 엔티티 | 테이블 (line) | 스코프 | 핵심 컬럼 |
|---|---|---|---|
| 노드 타입 | `node_catalog` (361) | **org** | `key`(org 내 unique), `label`, `property_schema`(jsonb) |
| 엣지 타입 | `edge_catalog` (391) | **org** | `key`, `domain_catalog_ids[]`, `range_catalog_ids[]`, `property_schema` |
| 노드 인스턴스 | `nodes` (953) | teamspace(+account) | `node_catalog_id`(FK), `title`, `properties`(lifecycleStatus 포함) |
| 엣지 인스턴스 | `edges` (986) | teamspace | `edge_catalog_id`(FK), `source_node_id`, `target_node_id`, `properties` |
| 페이지 | `pages` (1035) | teamspace(+account) | `parent_id`(트리), `spec`/`bindings`/`actions`(jsonb), `applies_to_node_type`, `subject_node_id`, `slug` — **그래프 노드 아님** |
| 에이전트 | `agent_definitions` (430) | teamspace(+account) | `name`, `instructions`(BlockNote), `tool_bundles[]`, `node_scopes`, `run_policy`(model/maxSteps/allowedTriggers/connectionTriggers) |
| 워커(샌드박스 툴) | `workers` (470) + `agent_definition_workers` (515) | teamspace | `script`, `runtime`(vercel_sandbox), `input/output_schema`, agent에 부착 |
| **스킬** | `skills` (563) + `skill_snapshots`(files[]) + `skill_packages` + `organization_skills` + `agent_definition_skills`(lock) | org/platform | **폴더 파일 구조** `files:[{path,contents}]` + per-agent 부착 + `lock{source,sourceType,skillPath,computedHash}` |
| 스케줄 | `schedules` (690) | teamspace(+account) | `agent_definition_id`, `cron_expression`, `timezone`(Asia/Seoul); heartbeat(UTC)가 발화 |
| 태스크 | `tasks` (718) | teamspace | 배치 단위 |

→ **시사점 1**: 남은 문제는 "새 서브시스템 구축"이 아니라 **MCP가 이 테이블들의 쓰기를 노출하는가**이다.
→ **시사점 2**: "에이전트 스킬 = 폴더 + progressive disclosure" 요구사항은 이미 `skill_snapshots.files[]` + `agent_definition_skills.lock` 설계로 **존재**(Claude Code skills-lock 포맷과 동형).
→ **시사점 3**: 새 도메인의 노드/엣지 **타입**도 `node_catalog`/`edge_catalog` **row 쓰기**로 생성 — 코드 편집 불필요.

- **그래프 `agent` 노드 표현은 사용 안 함**(inert). 에이전트는 `agent_definitions`로만. ✓ (확정)
- built-in 에이전트 10종만 시드. 인스턴스 노드/엣지 시드 0개.

### 2.2 DB에 쓰기가 있느냐 vs MCP가 노출하느냐

| 팩 요소 | DB 쓰기 존재 | MCP 노출 |
|---|---|---|
| 노드/엣지 인스턴스 | ✅ | ✅ `create_node`/`update_node`/`create_edge` |
| 태스크 배치 | ✅ | ✅ `spawn_task`/`update_task` |
| 노드/엣지 **타입**(catalog) | ✅ `node_catalog`/`edge_catalog` upsert | ❌ 미노출 (게다가 `create_node`의 catalogKey는 시드 enum 검증 — 확인 중) |
| **페이지** | ✅ page-port | ❌ 미노출 |
| **에이전트** | ✅ `upsertDefinition` | ❌ 미노출 |
| **워커/스킬** | ✅ ports | ❌ 미노출 |
| **스케줄** | ✅ schedule port | ❌ 미노출 |

- MCP URL `http://127.0.0.1:3001/api/mcp`. 로컬 auth는 `MCP_LOCAL_TOKEN` 미설정 시 아무 `Bearer` 허용. `plugins/ssota-plugin/mcp.json`에 `ssota-local` 등록. 스코프는 `orgSlug`+`teamspaceSlug` 매 호출.

→ MCP 확장 = **기존 포트/테이블 쓰기를 툴로 노출**(신규 서브시스템 아님). 선(先)설계 대신 **서브에이전트가 벽에 부딪히는 순서대로 노출**. (포트 시그니처·`create_node` catalogKey 검증 방식은 실행 중인 탐색으로 확정.)

## 3. 산출물 — Claude Code 플러그인 (기존 `ssota-plugin`에 얹기)

- 기존 스캐폴드: `plugins/ssota-plugin/` — `.cursor-plugin/plugin.json`(`skills:"skills"`, `mcpServers:"mcp.json"`), `mcp.json`(ssota-local), `skills/ssota-mcp/`(연결 가이드, SKILL.md + `references/*`로 이미 progressive disclosure).
- **추가할 것**: `plugins/ssota-plugin/skills/<ax-author>/` — AX 팩 저작 스킬(폴더 + progressive disclosure). `ssota-mcp`(연결/스코프) 위에 **팩 저작 방법론**을 얹는다(중복 X).
- 미러 정합(README.md 명시): `.cursor/plugins/local/ssota-plugin/`, `.agents/plugins/ssota-plugin/`, 그리고 스킬 정본 `.agents/skills/` + 미러 `.claude/skills/`·`.cursor/skills/` + `skills-lock.json`. `pnpm harness:mirrors` 그린.
- 이름 후보: `ssota-ax-pack` / `ssota-domain-pack`. (글로벌 `ssota-workflow-pair`는 stale, repo에 없음 — 대체 아님.)

## 4. 테스트 루프 (오늘의 진행 방식)

**역할 시뮬레이션**: 나(Claude Code) = **사람 유저 + 평가자**, 서브에이전트(빈 컨텍스트) = **유저의 Claude Code**. 즉 유저가 자기 Claude Code에 우리 플러그인을 물려 AX 세팅을 시키는 상황을 그대로 흉내 낸다.

```text
① 로컬 dev+supabase+MCP(:3001) 기동
② 빈 컨텍스트 서브에이전트에게 [AX 스킬 + SSOTA MCP]만 제공 (플랫폼 메인 에이전트 사용 X)
③ 서브에이전트가 한 도메인의 "환경"을 MCP로 저작 — catalog(타입) → page → agent(오케스트레이터 선호) → schedule
④ 내가(사람 유저 관점) 결과 평가 — 환경 저작 성공/실패, 카탈로그·엣지 정합, 페이지 렌더/승인 가능성, 스케줄 발화, 그리고 **어디서·왜 막혔는지**
⑤ 막힌 곳을 MCP 툴 노출/스킬로 보완 → ②로 반복 (스킬·MCP를 "하나씩 제공하며" 성숙)
```

- 로컬 상태(확인됨): Node 24 ✓, Docker ✓, Supabase core ✓, web :3000 ✓, **MCP :3001 미기동**(시작 필요), seed 데이터 확인 필요.
- 나는 **사람 유저 겸 평가자**. 서브에이전트가 MCP 실작업. 코드 시드는 하지 않는다(부산물 캡처는 예외).

## 5. 단계(슬라이스) — 환경 저작을 벽 순서대로

대상은 **환경**(catalog·page·agent·schedule)이지 인스턴스가 아니다. 인스턴스는 환경 검증용 최소만 만든다. **한 슬라이스 = 수직 컷**: ① 내가 MCP 쓰기 툴 빌드(기존 DB 포트 호출) → ② AX 스킬에 사용법 추가 → ③ 서브에이전트(=유저 CC)가 그 레이어 저작 → ④ 내가 평가 → ⑤ MCP·스킬 개정.

| 슬라이스 | 서브에이전트가 저작 | 내가 빌드할 MCP (기존 DB 포트) |
|---|---|---|
| **S0 baseline** ✅완료 | 현행 MCP로 환경 세팅 시도 → 벽 실증 | 없음. 판정: 현행 MCP로 환경 저작 **불가** |
| **S1** catalog | 노드/엣지 **타입**(엔티티·관계) | `create_node_type`/`create_edge_type`(node/edge_catalog upsert) + `create_node`/`create_edge` catalogKey 검증 완화 + `list_*_types`/`get_*_type`를 **DB org catalog에서** 읽기 |
| **S2** pages | 사람 승인용 페이지(spec/bindings/actions) | `create_page`/`update_page`(page-port) **+ UI 카탈로그 progressive-disclosure read**: `list_ui_components`(요약 매니페스트)→`get_ui_component`(props·example 상세), `list_binding_kinds`/`list_action_kinds`(어휘) — 49개 컴포넌트를 컨텍스트에 쏟지 않고 필요분만 로드 |
| **S3** agents | 에이전트(오케스트레이터 포함 선호) | `create_agent_definition`/`upsert_agent`(agent_definitions upsert) + worker/skill 부착 |
| **S4** schedules | 스케줄 + 자동 운영 발화 | `create_schedule`/`list_schedules`(schedule port) + heartbeat 발화 확인 |

**설계 원칙 — reference on demand**: AX MCP는 큰 참조 지식(UI 카탈로그, node-type property schema, edge domain/range, binding/action 어휘)을 **progressive disclosure**로 노출한다. 목록(요약) → 상세(on demand). 스킬의 progressive disclosure와 동형이며, 인-팩 에이전트 스킬(`skill_snapshots.files[]`)과도 같은 철학.

- **Task 1 (AX 능력 구축)** = S1–S4 MCP 툴 + AX 스킬을 **HR 근태·휴가를 작업 도메인으로** 슬라이스별 빌드·검증. 루프 확립.
- **Task 2 (SWDL 실증)** = 같은 능력으로 SWDL 환경(에이전트·스케줄 레이어)을 MCP로 저작 → 다른 도메인에서 스킬 견고화. **코드 시드 아님.**
- **Task 3 (일반화)** = HR 클린 재현 + 개인재무 신규 → "한 줄 입력 → 전체 환경", 도메인 불문 재사용 입증.

## 6. 세 과업

- [Task 1 요구사항](ax-task1-authoring-skill.md) — AX 저작 스킬 v0 (플러그인)
- [Task 2 요구사항](ax-task2-swdl-seed-completion.md) — SWDL로 실증·고도화(에이전트·스케줄까지)
- [Task 3 요구사항](ax-task3-domain-expansion.md) — HR·개인재무로 일반화
