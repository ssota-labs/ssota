# work.plan_roadmap

## 목적
프로젝트의 프로덕트 로드맵과 목표 구조를 작성·갱신한다.
(product_roadmap → roadmap → objective → key_result/kpi → initiative)

## 언제
- 유저가 로드맵 생성·갱신, OKR/목표 설정, 분기·연간 계획을 요청할 때
- 신규 프로젝트의 전략 로드맵을 채워야 할 때

## 선행 조건
- 먼저 스캐폴드를 읽는다: `get_workflow_instruction("agent.template.product_roadmap")`.
  섹션 구조를 따르되, `[ ]` 안내문은 **결과물에 복사하지 않는다.**
- 대상 스코프(org/project)를 확인한다.

## 목표설정 방법 (대부분 목표를 잘 못 세움 — 물어보기만 말고 제안하라)
1. **North-Star에 정렬**: 각 테마의 목표결과는 단일 North-Star 지표의 부분집합/선행지표여야 한다.
2. **모든 목표를 티어로: floor / target / stretch** — floor=반드시(0 방어), target=계획, stretch=잘되면. 단일 숫자 추측의 함정을 피한다.
3. **신규 역량은 0→1→N**: 처음엔 "1건 완주"로 됨을 증명(floor=1) → 반복성 → 규모.
4. **일반화 증명은 n≥2**: "다른 데서도 된다"는 n=1이면 우연, 2라야 패턴.
5. **런웨이 캘리브레이션**: 남은 기간으로 나눠 sanity-check (예: 2026년 중반이면 H2뿐).
6. **산출물 아닌 결과(outcome)**: "[행동] [지표]를 [기간] 내 [수치]로" 형태. 피처 나열 금지.

## 단계
1. 템플릿(선행 조건)과 현재 `product_roadmap`(`query_nodes(catalogKey=product_roadmap)`)을 읽는다.
2. 유저에게서 전략을 수집: 비전·타깃고객·문제/Why Now·전략테마·시간지평. 유저가 막히는 항목은 **초안을 제안**하고 확정받는다.
3. 측정 척추를 세운다(위 방법): North-Star 1개 + 테마별 티어 목표결과.
4. **쓰기 전에 프리뷰.** 조립한 내용을 보여주고 승인받는다 — 임의로 그래프에 쓰지 않는다.
5. 그래프에 쓴다:
   - `product_roadmap`(싱글톤) content를 마크다운으로 작성한다(리치 문서로 저장됨).
   - 호라이즌별 `roadmap`: `{kind:"annual"|"quarter", year, quarter?, parent_roadmap_id?}`.
   - 목표별 `objective`; `roadmap -[informs]-> objective` 로 연결.
   - `key_result -[contributes_to]-> objective`; `key_result -[measured_by]-> kpi`; `objective -[tracked_by]-> kpi`.
   - 실행은 `initiative`로 만들어 해당 objective에 연결.
6. `query_nodes`/`traverse_edges`로 검증하고, executive/roadmap 페이지 렌더를 확인한다.

## MCP 도구
- `get_workflow_instruction`, `query_nodes`, `get_node`, `create_node`, `update_node`, `create_edge`, `traverse_edges`

## 완료 기준
- product_roadmap이 합의된 전략을 반영한다.
- 호라이즌/objective/key_result가 생성·연결되었다.
- 유저가 내용을 승인했다.
