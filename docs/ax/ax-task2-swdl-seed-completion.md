# Task 2 — SWDL 첫 실증 도메인 (MCP로 환경 저작, 코드시드 아님)

> 상태: draft rev.2 · 2026-07-08 · 선행: [개요](ax-program-overview.md), [Task 1](ax-task1-authoring-skill.md)
> rev.2 재작성 사유: 초안은 "agent_definitions를 코드로 시드"(경로 A) 방식이었음 — 유저가 명시적으로 부정. **코드 시드가 아니라, Task 1의 AX 능력으로 SWDL 환경을 MCP로 저작**하는 것으로 전환.

## 1. 목적

Task 1에서 만든 AX 능력(MCP S1–S4 + 스킬)을 **SWDL(software-development-workflow) 도메인**에 적용해 견고화한다. SWDL은 HR과 성격이 다른(리치·기존) 도메인이라, 스킬이 **도메인 특수 지식 없이도** 동작하는지 대조 검증하는 첫 실증 무대다. 그리고 유저 원 목표 —"각 큰 워크플로우 기반 **에이전트·스케줄 레이어**까지 구성" + "독립 세션 에이전트가 테스트 프로젝트 전체를 세팅하는가"— 를 **MCP 저작으로** 달성한다.

## 2. 현재 SWDL 상태 (검증됨)

- **catalog**: org `ssota-labs`에 노드 40·엣지 类 시드됨(SWDL 타입). teamspace `ssota-dev`.
- **pages**: 5개 영역(Executive/Research/Manager/Development/Design) + per-initiative 24페이지 템플릿이 이미 광범위하게 존재(440 pages across teamspaces).
- **빈 곳**: 워크플로우 전용 **에이전트 0**(generic built-in 10종만), **스케줄 미미**(2), 자동 운영 흐름 없음.

→ SWDL의 진짜 결손 = **에이전트·스케줄 레이어**(그리고 인스턴스). catalog·pages는 이미 있음. 따라서 Task 2는 주로 **S3(agents)·S4(schedules)** 를 MCP로 저작하는 실증이다. (필요 시 누락 페이지 S2도.)

## 3. 요구사항

### 3.1 SWDL 환경의 에이전트·스케줄 레이어를 MCP로 저작
- 서브에이전트(=유저 CC)가 Task 1 스킬 + MCP로, SWDL 각 주요 워크플로우 영역에 대응하는 **에이전트를 `agent_definitions`로 저작**(오케스트레이터 포함 선호, 필수 아님)하고 **스케줄**을 건다.
- 표현은 `agent_definitions`만(그래프 `agent` 노드 안 씀). 코드 `SOFTWARE_DEV_TEMPLATE` 수정 아님 — 전부 MCP 런타임 저작.

### 3.2 독립 세션 에이전트 "전체 세팅" 테스트
- 별도 teamspace(예: 새 `swdl-proving`)에서, **Task 1 스킬만 장착한 독립 서브에이전트**에게 "이 제품(가상 예제)의 개발 워크플로우 환경을 세팅해줘"를 지시.
- 서브에이전트가 S1–S4(필요 시 catalog 확장 포함)로 **환경 전체를 MCP로 저작** → 자동 운영이 굴러가는지.
- **내가 평가**: 카탈로그 정합, 페이지 렌더·바인딩, 에이전트 정의 품질, 스케줄 발화, 누락/오류, 스킬이 SWDL 특수지식 없이 동작했는지.

### 3.3 스킬 견고화 (피드백 루프)
- HR(Task 1)과 SWDL(Task 2)의 대조에서 드러난 **도메인 종속 냄새**를 스킬에서 제거 → 도메인 불문 절차로 일반화.

## 4. 검증
- MCP 저작 후 `pnpm --filter web` preview로 SWDL 영역 페이지가 저작 인스턴스로 렌더되는지([PR-03]).
- 스케줄 발화 → 에이전트 run 실제 실행 확인(heartbeat 경로).
- 대조 평가: "동일 스킬, HR vs SWDL" — 개입 없이 일관 동작?

## 5. 완료 정의(DoD)
- [ ] SWDL 에이전트·스케줄 레이어가 **MCP 저작**으로 구성됨(코드 시드 아님)
- [ ] 독립 서브에이전트가 스킬+MCP만으로 신규 teamspace에 SWDL 환경 세팅, 자동 운영 확인
- [ ] web preview로 검증, 내 평가 리포트
- [ ] 대조에서 나온 피드백이 Task 1 스킬 일반화로 반영됨
