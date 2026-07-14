# PRD template

Author the PRD body (`properties.content`) with this skeleton — keep every section, even if brief:

1. **문제 정의** — 어떤 사용자 문제/기회인가; 근거 노드(`informs` 증거, hypothesis) 인용
2. **목표 (측정 가능)** — 이 initiative가 성공하면 무엇이 변하는가; 수치 목표 포함
3. **유저 & 시나리오** — 대상 사용자 세그먼트와 핵심 사용 시나리오
4. **범위 / 비범위** — 이번에 하는 것과 명시적으로 하지 않는 것
5. **요구사항 (기능별)** — feature 단위로 묶은 요구사항 목록; 각 항목이 이후 `feature` 노드가 된다
6. **성공 지표** — 목표를 검증할 지표; `kpi` 노드로 측정 가능해야 한다 (`measured_by`)
7. **리스크 / 오픈 퀘스천** — 알려진 리스크와 결정 대기 항목

## Quality bar

- Every `feature` split from this PRD is traceable to a numbered requirement in §5 — no orphan features
- Success metrics in §6 are measurable via a `kpi` node (existing or created), not vague aspirations
- 범위/비범위 answers "why not X" for the obvious adjacent scope
- Status flow: `draft` → human approval (`approved`) — approval fires `swdl.prd-approved-onpass-spawn` (Delivery setup spawn)
