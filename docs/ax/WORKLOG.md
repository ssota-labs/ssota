# AX 프로그램 워크로그 (resume-across-sessions)

> 이 파일은 세션이 끊겨도 이어서 작업하기 위한 **진행 기록 + 환경 상태 + 다음 단계**다.
> 최신 상태를 맨 위 "현재 상태"에 유지하고, 아래에 시간순 로그를 append 한다.
> 앵커 문서: [ax-program-overview.md](ax-program-overview.md) · 과업: [Task1](ax-task1-authoring-skill.md) · [Task2](ax-task2-swdl-seed-completion.md) · [Task3](ax-task3-domain-expansion.md)

---

## ⬛ 현재 상태 (2026-07-08, 한 줄)

**S1–S4 전 슬라이스 완료 + CAPSTONE PASS.** AX 능력(MCP S1–S4 + `ssota-ax-author` 스킬) 완성. 빈 컨텍스트 에이전트가 **한 줄 입력 → 개인재무 환경 전체(catalog 8+7, page 4, agent 5, schedule 2)** 를 스킬만으로 저작(Task 3 개인재무 케이스 사실상 완료). 다음 후보: (a) 라이브 web 렌더 데모(consolidated), (b) Task 2(SWDL MCP 저작 실증), (c) list_agents/edge domain-range enrich 등 마이너 follow-up, (d) 코드 템플릿 캡처(선택).

### CAPSTONE (개인재무, axfin/main, blank agent, skill-only) — PASS
- catalog 8 node + 7 edge, pages 4(hub+검토큐+투자+부채, approve/create 액션 round-trip), agents 5(4 specialist + orchestrator linked), schedules 2(daily+monthly, orchestrator). 의존순서 준수, 인스턴스 0. progressive disclosure(SKILL+4 refs+컴포넌트 카탈로그) 작동.
- **결론: "한 줄 입력 → 자율 운영 환경 전체 MCP 저작" 입증.**
- 피드백 반영: **`set_node_property` 다중 editable-column 액션 예시**를 page-authoring에 추가(주요 gap), list_* 반환 envelope(array vs `{components}`/`{agents}`) SKILL verify에 명시.
- 마이너 follow-up(미반영): create_page `slug` echo null, list_edge_types가 domain/range 미포함(get_edge_type만), propertySchema required는 instance-time 검증 명시.

### S4 루프 종료 요약
- **S4 MCP**(커밋 `ff4c2f9e`): `create_schedule`/`list_schedules`(schedule port). 가드: agent 존재 확인(Unknown agentDefinitionId), cron 5/6필드(Invalid cronExpression). test 3/3. end-to-end 브리지 OK(orchestrator daily 09:00). heartbeat 실발화는 런타임/배포 관심사(범위 밖).
- **S4 스킬 조각** + capstone 피드백 반영 후 커밋(대기).

### S3 루프 종료 요약
- **S3 MCP**(커밋 이후): `create_agent`(upsert agent_definition: name/description/body(md)/toolBundles/runPolicy(allowedTriggers·model·maxSteps)/linkedWorkerAgentIds). agent-runtime `write_agent_definition`보다 리치(툴·트리거·조직링크). test 6/6(create+reject). end-to-end 브리지: specialist+orchestrator(linked)+spawn_task 성공(UNKNOWN_AGENT_DEFINITION 벽 제거).
- **S3 스킬-테스트 PASS**: 서브에이전트가 3 specialist + 1 orchestrator(3개 링크) 저작, 실제 catalog/page 참조 플레이북, spawn_task 디스패치 성공.
- **피드백 반영(스킬 doc)**: `spawn_task.contextRefs`는 배열 아니라 **객체** `{nodeIds,edgeIds,taskIds}`(예시 추가); 워크드 예제 anomaly agent `["schedule"]`→`["task","schedule"]`(디스패치 대상은 지금 `task` 필요); create_agent 스코프 note.
- **follow-up(비차단)**: `list_agents`를 allowedTriggers+linkedWorkerAgentIds 포함으로 리치화(조직도 1콜 검증).
- 커밋: `[mcp] S3 create_agent`, `[infra] AX skill S3`(대기).

### S2 루프 종료 요약
- **S2 MCP**(커밋 `17ae5835`): `create_page`/`update_page`/`read_page`/`list_pages` + **`list_page_components`/`get_page_component`**(46 컴포넌트 progressive-disclosure). spec 안전성(unknown component/dangling ref reject). page-services test 5/5. agent-runtime `tools/pages.ts` 미러.
- **S2 스킬-테스트 PASS**: 서브에이전트가 스킬만으로 HR **4페이지 트리**(허브+근태현황+승인큐+신청서) 저작. progressive disclosure 2계층(스킬 파일 + 컴포넌트 카탈로그) 작동. 승인 액션=DataTable editable badge + `setAction`→`update_node`.
- **피드백 반영(스킬 doc 버그 수정)**: `filter`는 객체가 아니라 **배열** `[{key,op,value}]`(op=`eq|neq|exists`), 승인패턴은 per-row Button 아니라 **editable column+setAction**(value-ref `$input:"nodeId"`/`"value"`), traverse direction `out|in`, `create_page` arg envelope 문서화. (스키마·실제 저작 페이지로 ground-truth 검증.)
- **미완**: 라이브 web 렌더 데모(사람 승인 화면) — auth-gated, 최종 consolidated 검증에서 한 번에. spec은 validate+round-trip 확인됨.
- S2 subagent 산출 페이지는 dev/ax-hr-sandbox에 남아있음(S3 에이전트가 소유/구동할 대상).

### S1 루프 종료 요약
- **S1 스킬-테스트 PASS**: 빈 컨텍스트 서브에이전트가 스킬만 읽고(progressive disclosure 작동) HR catalog **7 node + 7 edge**를 일관되게 저작·검증. (1차 실행은 stream watchdog flake로 stall → 2차 성공.)
- **피드백 반영**:
  - MCP: `list_*_types`/`get_*_type`/`create_*_type`가 `key`+`catalogKey` 둘 다 노출(이전 list는 catalogKey만 → `.key` 투영 시 null 함정). `create_edge_type`가 domainKeys/rangeKeys echo. 테스트 6/6 유지, typecheck 그린.
  - 스킬: verify 단계에 `list_edge_types` 추가, identifier 필드 네이밍 문서화, worked example의 minimal-vs-upper 트림 가이드.
- 스킬 미러 5곳 동기화, `harness:mirrors` 통과(lock 경고는 기존 전역 이슈).
- 커밋: `[mcp] S1 polish`, `[infra] AX skill S1`.

### S1 end-to-end 검증 (브리지, dev/ax-hr-sandbox)
- `list_node_types` 빈 org → **0** (이전 39 phantom에서 수정, DB-backed) ✅
- `create_node_type`(employee/leave_request), `create_edge_type`(requests, domain/range→catalog id 해석) ✅
- **`create_node` 인스턴스(employee) 성공** — baseline에서 `invalid_enum_value`+`UNKNOWN_NODE_TYPE`로 막혔던 그 호출 ✅
- `create_edge`(custom type), `traverse_edges`, `search_catalog`('휴가'→leave_request) ✅
- 미커밋(브랜치 claude/magical-williams-37e5d7). MCP 서버 재기동됨(DATABASE_URL=54322 명시).

**재구조화(유저 승인)**: Task1=AX 능력 구축(MCP S1–S4 + 스킬, HR 작업도메인, 슬라이스 공진화) / Task2=SWDL 실증(MCP 저작, 코드시드 아님) / Task3=HR클린+개인재무 일반화. 폐기: 경로 A/B·graph-agent·L-Author/Provision·코드시드·인스턴스=목표.
**S2 보강(유저)**: 페이지 저작 시 **UI 카탈로그(49 컴포넌트)를 progressive disclosure로 MCP fetch**(`list_ui_components`→`get_ui_component`) + binding/action 어휘. 원칙 "reference on demand".

**빌드 플랜 (기존 DB 포트를 MCP 툴로 노출 — 신규 서브시스템 아님)**
1. **catalog**: `create_node_type`/`create_edge_type`(node_catalog/edge_catalog upsert) + `create_node`/`create_edge` catalogKey enum 검증 완화(DB org catalog 키 허용) + `list_*_types`/`get_*_type`를 **DB org catalog에서** 읽기(현재는 contracts 코드 enum — 불일치).
2. **page**: `create_page`/`update_page` (page-port).
3. **agent**: `create_agent_definition`(+worker/skill 부착) — `spawn_task` 선행조건.
4. **schedule**: `create_schedule`/`list_schedules` (schedule port) + heartbeat 발화 확인.
5. (후) worker/skill 쓰기.
- 실제 `apps/mcp` 제품 코드. 코어 use-case/포트 경유, 불변식 [GRAPH-01/02/04/05]·[SEC-01] 준수. 테스트 [TEST-01] 거부 케이스 포함.

### S0 baseline 판정 (서브에이전트, 증거 기반)
- 성공 쓰기 **0건**. HR 이름→`invalid_enum_value`(MCP enum), dev 타입→`UNKNOWN_NODE_TYPE`(dev org catalog 0행), dispatch→`UNKNOWN_AGENT_DEFINITION`(생성 툴 없음).
- 현행 22툴 = read + `create_node`/`update_node`/`create_edge`(인스턴스, 고정 z.enum) + `spawn_task`/`update_task`(기존 agent 대상). **타입/페이지/에이전트/스케줄 생성 툴 전무.**
- 에이전트가 요청한 부재 툴(§2.2 표와 일치): `create_node_type`,`create_edge_type`,`(seed_catalog)`,`create_page`,`create_agent_definition`,`create_schedule`/`list_schedules`,(+ `update_edge`/`delete_*`).
- **읽기/쓰기 소스 불일치**: catalog READ는 contracts 코드 enum, WRITE 검증은 DB node_catalog → 노출 시 읽기도 DB로 통일 필요.
- 주의: 서브에이전트가 :3001 재기동(node pid 19531). 중복 서버 가능 — 정리 필요. 저장소 파일 편집 없음(브리지만 사용).
- **정합성 점검(유저 요청)**: overview rev.2는 정합, task1·2·3는 교정 이전이라 stale(경로A/B·graph-agent·코드시드·인스턴스=목표 잔존) 확인 → **task1·2·3 rev.2 재작성** 완료. overview §5에 슬라이스 상세 + S2 UI-카탈로그 progressive-disclosure + "reference on demand" 원칙 추가. 유저 "MCP 직접 구현 OK".
- 다음: **S1 착수**(catalog write MCP 툴 구현).

### 2026-07-08 (세션 1 계속) — S1 구현
- **발견**: catalog write는 이미 다 구현돼 있음 — `CatalogWritePort`(core) + `createDbCatalogWritePort`(adapter) + agent-runtime `tools/graph.ts`의 `create_node_type`/`create_edge_type`가 레퍼런스. **MCP(apps/mcp)만 미노출**이었음. → S1 = 그 로직을 apps/mcp에 미러.
- **구현(3파일, apps/mcp만)**:
  - `lib/ports.ts`: `getCatalogWritePort(teamspaceId)` 추가(org 캐시로 스코프, `createDbCatalogWritePort`).
  - `lib/api/graph-services.ts`: `createNodeTypeForMcp`/`createEdgeTypeForMcp` 추가. `list_node_types`/`get_node_type`/`list_edge_types`/`get_edge_type`를 **DB org catalog에서** 읽도록 전환(기존 contracts enum → `getGraphPorts(ts).catalog`). 읽기/쓰기 소스 정합.
  - `lib/mcp/register-graph-tools.ts`: `catalogKeySchema`/`edgeCatalogKeySchema`를 enum→`z.string().min(1)`(Wall A 완화). `create_node_type`/`create_edge_type` 툴 등록. read 핸들러에 teamspaceId 전달.
- **테스트**: `graph-services.test.ts`를 DB-backed로 재작성(agent-services 패턴, DB 없으면 graceful skip). 6/6 통과(읽기·쓰기·거부케이스 포함, DATABASE_URL=54322). `pnpm --filter mcp typecheck` 그린.
- **contracts/core/adapter 변경 0** — 이미 존재하는 포트 재사용.
- 다음: MCP 서버 재기동(구 코드 kill) → 브리지로 end-to-end 검증(create_node_type→create_edge_type→create_node 인스턴스).
- S1 커밋 2개: `549d2c00`[infra] 문서, `5743a229`[mcp] S1 catalog write.
- **AX 스킬 S1 조각 작성**: `plugins/ssota-plugin/skills/ssota-ax-author/`(SKILL.md + references/catalog-authoring.md). ssota-mcp 위에 얹음, 미러 5곳(.agents/.cursor/skills + 3 plugin dirs), lock 불필요(첫파티는 lock 없음).
- 샌드박스 리셋(org dev catalog+인스턴스 0) → **S1 스킬-테스트 서브에이전트 실행**(HR catalog 저작, 스킬 직접 읽기=progressive disclosure 검증). 평가 대기.
- **S2/S3/S4 prep 발견**: agent-runtime `tools/pages.ts`에 `create_page`/`update_page`, `write_agent_definition` 툴 이미 존재 → **S2·S3·S4도 S1처럼 agent-runtime→apps/mcp 미러 잡**. PagePort/createPagePort 존재. S2 추가분 = UI 카탈로그 progressive-disclosure read 툴(list_ui_components/get_ui_component, PAGE_COMPONENT_CATALOG 기반).

### 🔎 핵심 발견 — 계층 벽 (브리지로 실증, org `dev`/`ax-hr-sandbox`)
- **Wall A (MCP 입력 enum)**: `create_node` catalogKey는 하드코딩 39-enum만 허용. 새 타입 `employee` → `-32602 invalid_enum_value`.
- **Wall B (DB catalog 해석)**: enum-valid 키(`task`)도 org의 `node_catalog` row 필요 → org `dev`는 0개 → `UNKNOWN_NODE_TYPE: 'task' not found`.
- **Wall C (catalog write 툴 없음)**: MCP가 `node_catalog`/`edge_catalog` 쓰기를 노출 안 함 → 에이전트가 org catalog를 채울 수 없음.
- **읽기 불일치**: `list_node_types`는 **DB org catalog가 아니라 코드 enum 39종**을 반환(org `dev` 빈 catalog인데 39종 표시) → 에이전트가 오해할 소지.
- 결론: 빈 org에서 에이전트는 **아무 노드도 생성 불가**. AX-from-scratch를 위해 catalog write + 검증 완화 + 읽기 정합이 **1순위 확장**.

---

## 🎯 목표·프레이밍 (확정 — 유저 교정 5회 반영)

- **AX = Agent Transformation** (회사를 에이전트 네이티브로 전환; DX 대응). *Experience 아님.*
- **AX 세팅** = 코딩 에이전트(Claude Code/Cursor/Codex)가 **MCP로 SSOTA "환경"을 바로바로 저작**. 환경 = **catalog(노드/엣지 타입) + 페이지 + 에이전트 + 스케줄 + 스킬**. **인스턴스(실데이터)는 대상 아님.**
- **Domain Pack** = 그 환경을 **반복 가능**하게 만든 것(후속/부산물).
- **산출물** = **Claude Code 플러그인**(SSOTA MCP + AX 저작 스킬). 기존 `plugins/ssota-plugin/`에 스킬 추가. 환경 저작에 필요한 MCP 쓰기 툴은 **기존 DB 포트를 노출**해 함께 만듦(신규 서브시스템 아님).
- **오케스트레이터** = 에이전트 "타입"이 아니라 스페셜 에이전트 하나(스케줄 걸고 하위에 배치). **필수 아님**, 선호 패턴. 조직도처럼 중첩 가능.
- **메인 에이전트** = 플랫폼 유저 대화 창구. 자동 운영과 **별개**, 오케스트레이터와 소통 안 함. **테스트 범위 밖.**
- **테스트 방식** = 나(Claude Code) = **사람 유저 + 평가자**, 서브에이전트(빈 컨텍스트) = **유저의 Claude Code**. 서브에이전트가 MCP로 환경 저작 → 내가 평가 → 벽/모호점을 MCP·스킬로 보완 → 반복. **코드 시드는 안 함**(부산물 캡처만 예외).

---

## 🧱 시스템 사실관계 (schema.ts = ground truth)

팩의 모든 요소가 **이미 DB 1급 테이블**. `packages/adapter-postgres/src/db/schema.ts`.

| 엔티티 | 테이블(line) | 스코프 | 비고 |
|---|---|---|---|
| 노드 타입 | `node_catalog`(361) | **org** | `key` uniq/org, `property_schema` jsonb. **코드 enum 아님, DB 데이터** |
| 엣지 타입 | `edge_catalog`(391) | **org** | `domain_catalog_ids[]`,`range_catalog_ids[]`,`property_schema` |
| 노드 | `nodes`(953) | teamspace(+account) | `node_catalog_id` FK, `properties`(lifecycleStatus 포함) |
| 엣지 | `edges`(986) | teamspace | `edge_catalog_id` FK, source/target |
| 페이지 | `pages`(1035) | teamspace(+account) | 트리(`parent_id`), `spec`/`bindings`/`actions` jsonb, `applies_to_node_type`, `subject_node_id`, `slug`. **그래프 노드 아님** |
| 에이전트 | `agent_definitions`(430) | teamspace(+account) | `instructions`(BlockNote), `tool_bundles[]`, `node_scopes`, `run_policy`(model/maxSteps/allowedTriggers/connectionTriggers) |
| 워커(샌드박스 툴) | `workers`(470)+`agent_definition_workers`(515) | teamspace | `script`,`runtime`(vercel_sandbox) |
| 스킬 | `skills`(563)+`skill_snapshots`(files[])+`skill_packages`+`organization_skills`+`agent_definition_skills`(lock)(656) | org/platform | **폴더 파일 구조 + progressive disclosure 이미 존재**; lock 포맷이 Claude Code `skills-lock.json`과 동형 |
| 스케줄 | `schedules`(690) | teamspace(+account) | `agent_definition_id`,`cron_expression`,`timezone`(Asia/Seoul); heartbeat(UTC)가 발화 |
| 태스크 | `tasks`(718) | teamspace | |

**MCP 쓰기 노출 현황**: 인스턴스 `create_node`/`update_node`/`create_edge` ✅, `spawn_task`/`update_task` ✅. **catalog·page·agent·worker·skill·schedule 쓰기는 DB엔 있으나 MCP 미노출** ❌ → 확장 = 기존 포트를 툴로 노출.
- 그래프 `agent` 노드 표현(`owned_page_route_key`/`agent_owns_page`)은 **사용 안 함(inert)**. 에이전트는 `agent_definitions`로만.
- 미확인: `create_node`의 catalogKey가 시드 enum 검증인지 DB catalog 검증인지 / `list_node_types`가 DB catalog를 읽는지 코드 enum을 읽는지(브리지로 확인 예정) / 스케줄 발화(heartbeat) 실제 경로 / dispatch(spawn_task 중첩·linkedWorkerAgentIds).

MCP 툴 표면 상세는 3개 탐색 리포트에 정리됨(이 세션 내). 스케줄러·dispatch·write-port 시그니처 탐색은 진행 중이었음(agentId a09457a3859c6ef4f).

---

## 🖥️ 로컬 환경 상태 (resume에 필수)

- **Node**: bash 기본 v24.0.2 ✓ (nvmrc=24)
- **Docker**: up ✓. Supabase 스택 **2개** 공존:
  - `supabase_db_ssota` → host **:54322** (← **이게 SSOTA**), kong :54321, studio :54323
  - `supabase_db_platform` → host :55322 (다른 프로젝트 = Mirror Dimension. 건드리지 말 것)
- **ssota DB 접속**: `docker exec -e PGPASSWORD=postgres supabase_db_ssota psql -U postgres -d postgres -tAc "<SQL>"` (psql은 PATH에 없어 docker exec 사용)
- **ssota DB 시드 상태(확인됨)**: org `dev`/`smoke`/`ssota-labs`; 42 public tables; node_catalog 80(ssota-labs 40), edge_catalog 36, agent_definitions 110, pages 440, nodes 46, edges 28, schedules 2, skills 10, workers 0.
- **MCP 서버 :3001**: `apps/mcp` (`pnpm dev --filter mcp`). **local auth** (`authorization_servers: []`) — `MCP_LOCAL_TOKEN` 미설정 → 아무 `Bearer` 허용. `initialize`+`tools/call` **stateless**로 작동(세션 id 불필요). `apps/mcp/.env.local`은 **없지만** 서버는 정상 동작(DATABASE_URL이 어디선가 주입됨 — 재기동 시 주의).
  - **주의**: 이 세션의 native MCP 클라이언트(`mcp__777765a1-f9ae-4711-b85d-7388fab64ff5__*`)는 :3001이 죽어 있을 때 바인딩돼 **ERR_FAILED**로 죽어 있음. 서브에이전트도 같은 죽은 커넥션 공유 → **native MCP 사용 불가**. → **curl 브리지로 우회**(아래).
  - 새 세션에서는 :3001을 먼저 띄운 뒤 시작하면 native MCP가 살아있을 수도 있음(검증 필요).
- **MCP 브리지**: `<scratchpad>/mcp_call.sh <tool> <jsonArgs>` — env `SSOTA_MCP_URL`(기본 :3001/api/mcp), `SSOTA_MCP_TOKEN`(기본 localdev). **버그 수정 중**(jq --argjson, curl SSE 무한대기 → `--max-time` 필요).
- **테스트 테넌트**:
  - local-auth 유저 = `00000000-0000-0000-0000-000000000001` (`dev@localhost`) → org **`dev`** (catalog 0 = 빈 슬레이트).
  - **생성됨**: teamspace **`ax-hr-sandbox`** (id `586b2c98-55a3-44b4-94db-1f7565bf3e67`) under org `dev`. ← S0 baseline 대상.
  - 리치 시드 테넌트(참고): org `ssota-labs`(id `5557f16f-1015-4200-840c-bd38a40121d0`), teamspace `ssota-dev`(id `8ef48bdf-a8bf-4c71-bba7-b4b6834d7374`, app_enabled). SWDL 40 타입. dev 유저는 여기 멤버 아님.
- **web :3000**: up(307). 
- **백그라운드 프로세스**: MCP 서버는 orphaned bash(PID 5153)로 돌고 있음. 재기동 필요 시 kill 후 `pnpm dev --filter mcp`.

---

## 🧭 슬라이스 계획 (환경-우선; 인스턴스는 검증용 최소만)

| 슬라이스 | 서브에이전트가 시도 | 필요한 MCP 노출 |
|---|---|---|
| **S0 baseline** | 현행 MCP만으로 HR 근태·휴가 환경 세팅 → 벽 관찰 | 없음 |
| **S1** | catalog(노드/엣지 타입) 저작 | node/edge_catalog upsert + create_node catalogKey 검증 완화 |
| **S2** | 사람 승인용 페이지 저작 | page upsert |
| **S3** | 에이전트(오케스트레이터 선호) 저작 | agent_definitions upsert(+worker/skill 부착) |
| **S4** | 스케줄 저작 + 자동 운영 발화 확인 | schedule create + heartbeat 확인 |

Task1=스킬 v0+S0+S1 · Task2=SWDL로 S1–S4 실증·고도화 · Task3=HR/개인재무로 반복.

---

## 🗒️ 결정 로그

- **D1** 팩은 코드 시드가 아니라 **에이전트가 MCP로 런타임 저작**. 코드 템플릿 캡처는 선택적 부산물.
- **D2** 그래프 `agent` 노드 표현 폐기 → 에이전트는 `agent_definitions`.
- **D3** 산출물 = **Claude Code 플러그인**(`plugins/ssota-plugin`에 AX 스킬 추가), 기존 `ssota-mcp` 스킬 위에 얹음.
- **D4** native MCP 죽음 → **curl 브리지**로 테스트(툴 계약 동일, 재현 가능). 실사용자는 native MCP.
- **D5** 테스트 테넌트 = org `dev` + 신규 teamspace `ax-hr-sandbox`(빈 슬레이트, catalog 0) — AX-from-scratch 관찰에 최적.
- **D6** 오케스트레이터·스케줄러 = 선호 패턴, 필수 아님. 메인 에이전트는 범위 밖.

---

## 🕒 진행 로그 (append-only)

### 2026-07-08 (세션 1)
- 요구사항 문서 4종 작성: overview + task1/2/3 (`docs/ax/`). 유저 교정 5회 반영해 overview rev.2로 재작성.
  - 교정: (1) AX=Transformation (2) 오케스트레이터 선택·타입 아님 (3) 메인 별개·범위 밖 (4) AX세팅=환경(카탈로그) not 인스턴스 (5) 산출물=CC 플러그인, 블랭크 서브에이전트가 MCP로 저작.
- 시스템 재탐색: **catalog·pages·agents·workers·skills·schedules 모두 DB 테이블**임을 schema.ts로 확인(이전 contracts-enum 중심 이해 정정).
- 로컬 환경 파악: supabase 2스택 공존(ssota=:54322, platform=:55322), ssota DB 시드 확인.
- MCP :3001 기동(orphan PID 5153). native MCP 클라이언트는 죽음(startup 시 :3001 down) → 서브에이전트도 공유 → **curl로 서버 정상 확인**(list_organizations→org `dev`).
- 테넌트 준비: teamspace `ax-hr-sandbox` under org `dev` 생성.
- 브리지 `mcp_call.sh` 작성 → 버그(`${2:-{}}`가 `{}}` 생성 / curl SSE 무한대기) 수정(`--max-time 40`, args JSON 검증).
- 브리지 검증 완료: `list_organizations`→org dev, `list_projects`→ax-hr-sandbox(scope 확인), 각 1s.
- **계층 벽 3종 실증**(위 "핵심 발견" 참조): create_node가 (A)MCP enum + (B)DB org catalog 이중 검증, (C)catalog write 툴 없음. `list_node_types`는 코드 enum 반환(DB 아님). → 첫 확장 = catalog write + 검증 완화.
- 브리지에 `--tools`(tools/list) 추가했으나 서버가 stateless라 tools/list는 **빈 응답**(handshake 필요) → 서브에이전트엔 툴 인벤토리를 직접 제공. tools/call은 정상.
- **S0 baseline 서브에이전트 실행**(blank context, HR 근태·휴가 환경 저작, org dev/ax-hr-sandbox, 브리지 사용). 리포트 대기 → 평가 예정. 확인 툴 표면: account/graph-read/graph-write(node·edge instance)/agents/tasks. **catalog·page·agent·schedule WRITE는 없음**(예상 벽).

### 하네스 준비 완료 (재사용)
- 브리지: `<scratchpad>/mcp_call.sh <tool> '<jsonArgs>'` (env SSOTA_MCP_URL, SSOTA_MCP_TOKEN=localdev). scope 인자 `"orgSlug":"dev","teamspaceSlug":"ax-hr-sandbox"` 필수.
- native mcp__777765a1__* 툴은 이 세션에서 죽음(서브에이전트도 공유) → 브리지만 사용.

---

## 📎 자주 쓰는 명령

```bash
# ssota DB 쿼리
docker exec -e PGPASSWORD=postgres supabase_db_ssota psql -U postgres -d postgres -tAc "select slug from organizations;"
# MCP 서버 살아있나
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/mcp -X POST -H "Authorization: Bearer localdev" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"c","version":"1"}}}'
# MCP 서버 (재)기동
pnpm dev --filter mcp     # :3001
# 브리지
bash <scratchpad>/mcp_call.sh list_organizations '{}'
```
