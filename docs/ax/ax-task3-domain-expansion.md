# Task 3 — 도메인 일반화 (HR 클린 재현 + 개인재무 신규)

> 상태: draft rev.2 · 2026-07-08 · 선행: [개요](ax-program-overview.md), [Task 1](ax-task1-authoring-skill.md), [Task 2](ax-task2-swdl-seed-completion.md)
> rev.2 재작성 사유: 초안의 "경로 A(코드 시드 HR/finance pack)"·"경로 결정 종속" 프레이밍 폐기. MCP 저작으로 확정됐고, S0 baseline이 HR을 이미 프로빙함.

## 1. 목적

AX 능력(Task 1) + 견고화(Task 2)를 거친 스킬이 **"한 줄 입력 → 전체 환경 저작"** 을 도메인 불문 재현하는지 최종 시험한다. 성공 기준은 **동일 스킬·동일 MCP로, 도메인만 바꿔** 환경(catalog·page·agent·schedule)이 세팅되는 것.

## 2. 테스트 케이스

### 2.1 HR 근태·휴가 (클린 재현)
- 입력: *"우리 회사의 근태, 휴가 관리 체계를 구축하고 싶어."*
- Task 1에서 슬라이스별로 쌓아 만든 HR 환경을, **성숙한 스킬로 처음부터 한 번에** 재현 → 빌드-타임(Task 1)과 억셉턴스-타임(Task 3)의 차이를 본다.
- 참고 설계(S0/Task1 산출): 노드 `employee`·`department`·`leave_policy`·`leave_type`·`leave_balance`·`leave_request`·`attendance_record`·`work_schedule`·`holiday_calendar`·`approval`; 엣지 `belongs_to`·`reports_to`·`requests`·`covered_by`·`deducts_from`·`approved_by`·`logs`; 페이지 HR Ops·My Leave·Team Calendar·Policy admin; 에이전트 접수·승인라우팅·이상탐지·정산(+오케스트레이터); 스케줄 일일 스캔·월간 정산.

### 2.2 개인재무 가계 관리 (신규 도메인)
- 입력: *"우리 집의 지출내역, 투자 자산, 자산 거래내역, 부채내역을 관리하고 싶어."*
- SWDL·HR과 거의 겹치지 않는 완전 신규 도메인 → 스킬의 도메인 불문성을 가장 강하게 시험.
- 참고 설계: 노드 `financial_account`·`transaction`·`expense`·`income`·`holding`·`liability`·`budget`; 엣지 transaction `for` account, holding `held_in` account, expense `paid_from` account, liability `owed_to` counterparty; 페이지 순자산 대시보드·지출 원장·포트폴리오·부채 상환; 에이전트 거래분류·월간리포트(+스케줄).

## 3. 요구사항
- 두 케이스 각각: **한 줄 입력 → 서브에이전트(=유저 CC)가 스킬+MCP로 S1–S4 환경 전체 저작**.
- catalog·page·agent·schedule 모두 MCP 런타임 저작(코드 시드 아님).
- 스킬은 도메인 특수 지식(SWDL/HR 냄새) 없이 동작.

## 4. 검증
- 각 도메인 저작 후 `pnpm --filter web` preview로 주요 페이지 렌더·인터랙션([PR-03]).
- "동일 스킬, 3도메인(SWDL·HR·재무)" 대조 — 개입 없이 일관 동작?
- 자동 운영(스케줄 발화) 확인.

## 5. 완료 정의(DoD)
- [ ] HR·개인재무 각각 한 줄 입력으로부터 catalog·page·agent·schedule 전체가 서브에이전트에 의해 MCP 저작됨
- [ ] web preview로 두 도메인 검증
- [ ] 스킬이 도메인 불문(3도메인 대조 통과)임을 입증
- [ ] AX 능력 셋(MCP 표면 + 스킬)이 "새 도메인 = 반복 가능한 절차"임을 최종 확인
