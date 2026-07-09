/**
 * 채용(ATS) 도메인의 hero Dashboard 페이지 — ssota-ax-author 스킬로 저작.
 *
 * Dashboard 아키타입: 상단 KPI 스트립(StatRow/StatTile) → 채용 파이프라인(DataTable)
 * → 오퍼 승인 큐(ApprovalInbox) + 최근 활동(Timeline)을 2열 Grid로 배치.
 *
 * 바인딩은 query-shaped: 각 컴포넌트의 props.binding 문자열 키는 bindingData에
 * 존재해야 하며, 값은 노드 배열 또는 단일 노드({ id, catalogKey, title, properties })다.
 * KPI는 바인딩에서 계산 가능(count/avg)하도록 각 바인딩이 해당 필터 집합을 담는다 —
 * 실제 런타임의 query 바인딩과 동일하게, 같은 노드가 여러 바인딩 결과에 나타날 수 있다.
 *
 * 식별자는 영어, 카피는 한국어. import 없이 단일 리터럴로 export한다.
 */

import type { PageRuntimeDemo } from "./page-runtime-demos";

// 채용 단계 → 부드러운 oklch 칩 색상(플로우 토큰 계열).
// DataTable은 colors 값을 raw CSS backgroundColor로 적용하므로 유효한 CSS 색상 문자열을 쓴다
// ("amber"는 CSS 키워드가 아니라 렌더 안 됨 → oklch 사용, 랩 데모 컨벤션과 동일).
const stageColors = {
  applied: "oklch(0.93 0.02 250)", // gray  — 지원 접수
  screen: "oklch(0.92 0.06 80)", //  amber — 서류/스크리닝
  interview: "oklch(0.9 0.06 250)", // blue  — 인터뷰
  offer: "oklch(0.9 0.06 300)", //   purple — 오퍼
  hired: "oklch(0.9 0.07 150)", //   green — 채용 확정
  rejected: "oklch(0.9 0.08 25)", //  red   — 불합격
};

export const axRecruitingDashboard = {
  id: "ax-recruiting-dashboard",
  category: "data",
  title: "채용 현황 대시보드 (agent-authored)",
  description:
    "채용(ATS) 도메인 hero 대시보드: 상단 KPI 스트립(채용 중 포지션·진행 중 후보자·진행 중 오퍼·평균 평점), 단계별 채용 파이프라인(DataTable — 단계 배지 더블클릭으로 이동), 오퍼 승인 큐(ApprovalInbox), 최근 활동 타임라인. Dashboard 아키타입 + 9포인트 셀프리뷰 통과.",
  components: [
    "Stack",
    "Section",
    "StatRow",
    "StatTile",
    "Grid",
    "DataTable",
    "ApprovalInbox",
    "Timeline",
  ],
  spec: {
    root: "page",
    elements: {
      page: {
        type: "Stack",
        props: { gap: "lg" },
        children: ["kpiSection", "pipeSection", "bottomGrid"],
      },

      // ── KPI 스트립 ────────────────────────────────────────────────
      kpiSection: {
        type: "Section",
        props: { title: "핵심 지표", subtitle: "채용 파이프라인 요약 · 전주 대비" },
        children: ["kpiRow"],
      },
      kpiRow: {
        type: "StatRow",
        props: { columns: 4 },
        children: ["kReqs", "kActive", "kOffers", "kRating"],
      },
      kReqs: {
        type: "StatTile",
        props: {
          binding: "openReqs",
          label: "채용 중 포지션",
          aggregate: "count",
          deltaValue: 1,
        },
      },
      kActive: {
        type: "StatTile",
        props: {
          binding: "activeCandidates",
          label: "진행 중 후보자",
          aggregate: "count",
          deltaValue: 6,
        },
      },
      kOffers: {
        type: "StatTile",
        props: {
          binding: "offersOut",
          label: "진행 중 오퍼",
          aggregate: "count",
          deltaValue: -1,
        },
      },
      kRating: {
        type: "StatTile",
        props: {
          binding: "pipeline",
          label: "평균 후보 평점",
          valueField: "rating",
          aggregate: "avg",
          format: "number",
          unit: "/5",
          deltaValue: 0.2,
        },
      },

      // ── 채용 파이프라인 (working surface) ─────────────────────────
      pipeSection: {
        type: "Section",
        props: {
          title: "채용 파이프라인",
          subtitle: "단계별 후보자 — 단계 배지를 더블클릭해 이동",
        },
        children: ["pipeTable"],
      },
      pipeTable: {
        type: "DataTable",
        props: {
          binding: "pipeline",
          setAction: "advanceStage",
          addAction: "addCandidate",
          addLabel: "후보자 추가",
          emptyLabel:
            "아직 후보자가 없습니다 — '후보자 추가'로 파이프라인을 시작하세요.",
          columns: [
            { key: "title", header: "후보자", type: "text" },
            {
              key: "stage",
              header: "단계",
              type: "badge",
              editable: true,
              options: ["applied", "screen", "interview", "offer", "hired", "rejected"],
              colors: stageColors,
            },
            { key: "role", header: "지원 포지션", type: "text" },
            { key: "source", header: "유입 경로", type: "text" },
            { key: "rating", header: "평점", type: "number" },
            { key: "appliedAt", header: "지원일", type: "date" },
          ],
        },
      },

      // ── 승인 큐 + 활동 피드 (2열) ─────────────────────────────────
      bottomGrid: {
        type: "Grid",
        props: { columns: 2, gap: "lg" },
        children: ["approvalSection", "activitySection"],
      },
      approvalSection: {
        type: "Section",
        props: { title: "오퍼 승인 대기", subtitle: "승인 또는 반려" },
        children: ["inbox"],
      },
      inbox: {
        type: "ApprovalInbox",
        props: {
          binding: "pendingOffers",
          titleField: "title",
          metaFields: ["candidate", "approver"],
          statusField: "status",
          approveAction: "approveOffer",
          rejectAction: "rejectOffer",
          approveLabel: "승인",
          rejectLabel: "반려",
          approveValue: "approved", // offer status enum
          rejectValue: "declined", // offer status enum (기본 "rejected"는 enum 밖 → 재정의)
          emptyLabel: "모두 처리됨",
          emptyDescription: "승인 대기 중인 오퍼가 없습니다.",
        },
      },
      activitySection: {
        type: "Section",
        props: { title: "최근 활동", subtitle: "최신순 · 일자별" },
        children: ["feed"],
      },
      feed: {
        type: "Timeline",
        props: {
          binding: "activity",
          timeField: "createdAt",
          titleField: "note",
          byField: "actor",
          statusField: "stage",
          groupByDay: true,
          emptyLabel: "아직 활동이 없습니다",
        },
      },
    },
  },

  // bindingData — 각 props.binding 키로 사전 해석된 노드 집합.
  bindingData: {
    // 채용 중(status=open) 공고만 → KPI count = 5.
    openReqs: [
      {
        id: "1e900000-0000-4000-8000-000000000001",
        catalogKey: "job_requisition",
        title: "시니어 백엔드 엔지니어",
        properties: {
          dept: "Engineering",
          status: "open",
          openings: 2,
          hiringManager: "박지훈",
          openedAt: "2026-06-01",
        },
      },
      {
        id: "1e900000-0000-4000-8000-000000000002",
        catalogKey: "job_requisition",
        title: "프론트엔드 엔지니어",
        properties: {
          dept: "Engineering",
          status: "open",
          openings: 1,
          hiringManager: "박지훈",
          openedAt: "2026-06-10",
        },
      },
      {
        id: "1e900000-0000-4000-8000-000000000003",
        catalogKey: "job_requisition",
        title: "프로덕트 디자이너",
        properties: {
          dept: "Design",
          status: "open",
          openings: 1,
          hiringManager: "김수민",
          openedAt: "2026-06-15",
        },
      },
      {
        id: "1e900000-0000-4000-8000-000000000004",
        catalogKey: "job_requisition",
        title: "데이터 엔지니어",
        properties: {
          dept: "Engineering",
          status: "open",
          openings: 1,
          hiringManager: "박지훈",
          openedAt: "2026-06-20",
        },
      },
      {
        id: "1e900000-0000-4000-8000-000000000005",
        catalogKey: "job_requisition",
        title: "프로덕트 매니저",
        properties: {
          dept: "Product",
          status: "open",
          openings: 1,
          hiringManager: "이가람",
          openedAt: "2026-06-22",
        },
      },
    ],

    // 전체 후보자 12명(모든 단계) → DataTable rows + 평균 평점(avg=3.67).
    pipeline: [
      {
        id: "ca000000-0000-4000-8000-000000000001",
        catalogKey: "candidate",
        title: "김서연",
        properties: {
          stage: "interview",
          role: "시니어 백엔드 엔지니어",
          source: "추천",
          appliedAt: "2026-06-20",
          rating: 4,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000002",
        catalogKey: "candidate",
        title: "이준호",
        properties: {
          stage: "screen",
          role: "프로덕트 디자이너",
          source: "링크드인",
          appliedAt: "2026-06-28",
          rating: 3,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000003",
        catalogKey: "candidate",
        title: "박민지",
        properties: {
          stage: "applied",
          role: "프론트엔드 엔지니어",
          source: "채용페이지",
          appliedAt: "2026-07-05",
          rating: 4,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000004",
        catalogKey: "candidate",
        title: "최유진",
        properties: {
          stage: "offer",
          role: "시니어 백엔드 엔지니어",
          source: "추천",
          appliedAt: "2026-06-15",
          rating: 5,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000005",
        catalogKey: "candidate",
        title: "정도현",
        properties: {
          stage: "interview",
          role: "데이터 엔지니어",
          source: "링크드인",
          appliedAt: "2026-06-25",
          rating: 4,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000006",
        catalogKey: "candidate",
        title: "강하늘",
        properties: {
          stage: "applied",
          role: "프론트엔드 엔지니어",
          source: "채용페이지",
          appliedAt: "2026-07-06",
          rating: 3,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000007",
        catalogKey: "candidate",
        title: "윤서진",
        properties: {
          stage: "screen",
          role: "프로덕트 매니저",
          source: "추천",
          appliedAt: "2026-07-01",
          rating: 4,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000008",
        catalogKey: "candidate",
        title: "임재현",
        properties: {
          stage: "interview",
          role: "데이터 엔지니어",
          source: "이벤트",
          appliedAt: "2026-06-27",
          rating: 3,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000009",
        catalogKey: "candidate",
        title: "한지우",
        properties: {
          stage: "offer",
          role: "프로덕트 디자이너",
          source: "링크드인",
          appliedAt: "2026-06-18",
          rating: 5,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000010",
        catalogKey: "candidate",
        title: "오세훈",
        properties: {
          stage: "applied",
          role: "DevOps 엔지니어",
          source: "채용페이지",
          appliedAt: "2026-07-07",
          rating: 2,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000011",
        catalogKey: "candidate",
        title: "서예린",
        properties: {
          stage: "hired",
          role: "프론트엔드 엔지니어",
          source: "추천",
          appliedAt: "2026-05-30",
          rating: 5,
        },
      },
      {
        id: "ca000000-0000-4000-8000-000000000012",
        catalogKey: "candidate",
        title: "신동욱",
        properties: {
          stage: "rejected",
          role: "데이터 엔지니어",
          source: "링크드인",
          appliedAt: "2026-06-10",
          rating: 2,
        },
      },
    ],

    // 진행 중 후보자(hired/rejected 제외) = 10 → KPI count = 10.
    // 실제 query 바인딩과 동일하게 pipeline의 필터 부분집합.
    activeCandidates: [
      {
        id: "ca000000-0000-4000-8000-000000000001",
        catalogKey: "candidate",
        title: "김서연",
        properties: { stage: "interview", role: "시니어 백엔드 엔지니어", source: "추천", appliedAt: "2026-06-20", rating: 4 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000002",
        catalogKey: "candidate",
        title: "이준호",
        properties: { stage: "screen", role: "프로덕트 디자이너", source: "링크드인", appliedAt: "2026-06-28", rating: 3 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000003",
        catalogKey: "candidate",
        title: "박민지",
        properties: { stage: "applied", role: "프론트엔드 엔지니어", source: "채용페이지", appliedAt: "2026-07-05", rating: 4 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000004",
        catalogKey: "candidate",
        title: "최유진",
        properties: { stage: "offer", role: "시니어 백엔드 엔지니어", source: "추천", appliedAt: "2026-06-15", rating: 5 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000005",
        catalogKey: "candidate",
        title: "정도현",
        properties: { stage: "interview", role: "데이터 엔지니어", source: "링크드인", appliedAt: "2026-06-25", rating: 4 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000006",
        catalogKey: "candidate",
        title: "강하늘",
        properties: { stage: "applied", role: "프론트엔드 엔지니어", source: "채용페이지", appliedAt: "2026-07-06", rating: 3 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000007",
        catalogKey: "candidate",
        title: "윤서진",
        properties: { stage: "screen", role: "프로덕트 매니저", source: "추천", appliedAt: "2026-07-01", rating: 4 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000008",
        catalogKey: "candidate",
        title: "임재현",
        properties: { stage: "interview", role: "데이터 엔지니어", source: "이벤트", appliedAt: "2026-06-27", rating: 3 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000009",
        catalogKey: "candidate",
        title: "한지우",
        properties: { stage: "offer", role: "프로덕트 디자이너", source: "링크드인", appliedAt: "2026-06-18", rating: 5 },
      },
      {
        id: "ca000000-0000-4000-8000-000000000010",
        catalogKey: "candidate",
        title: "오세훈",
        properties: { stage: "applied", role: "DevOps 엔지니어", source: "채용페이지", appliedAt: "2026-07-07", rating: 2 },
      },
    ],

    // 진행 중 오퍼(pending_approval + sent) = 4 → KPI count = 4.
    offersOut: [
      {
        id: "0ff00000-0000-4000-8000-000000000001",
        catalogKey: "offer",
        title: "오퍼 — 최유진 · 시니어 백엔드 엔지니어",
        properties: { candidate: "최유진", status: "pending_approval", amount: 95000000, approver: "박지훈 (VP Eng)" },
      },
      {
        id: "0ff00000-0000-4000-8000-000000000002",
        catalogKey: "offer",
        title: "오퍼 — 한지우 · 프로덕트 디자이너",
        properties: { candidate: "한지우", status: "pending_approval", amount: 82000000, approver: "김수민 (Head of Design)" },
      },
      {
        id: "0ff00000-0000-4000-8000-000000000003",
        catalogKey: "offer",
        title: "오퍼 — 문지호 · 백엔드 엔지니어",
        properties: { candidate: "문지호", status: "sent", amount: 86000000, approver: "박지훈 (VP Eng)" },
      },
      {
        id: "0ff00000-0000-4000-8000-000000000004",
        catalogKey: "offer",
        title: "오퍼 — 배수아 · 프로덕트 디자이너",
        properties: { candidate: "배수아", status: "sent", amount: 80000000, approver: "김수민 (Head of Design)" },
      },
    ],

    // 승인 대기(status=pending_approval) = 2 → ApprovalInbox 비어있지 않음.
    // offersOut의 필터 부분집합(동일 노드가 두 바인딩 결과에 등장 — query 모델과 일치).
    pendingOffers: [
      {
        id: "0ff00000-0000-4000-8000-000000000001",
        catalogKey: "offer",
        title: "오퍼 — 최유진 · 시니어 백엔드 엔지니어",
        properties: { candidate: "최유진", status: "pending_approval", amount: 95000000, approver: "박지훈 (VP Eng)" },
      },
      {
        id: "0ff00000-0000-4000-8000-000000000002",
        catalogKey: "offer",
        title: "오퍼 — 한지우 · 프로덕트 디자이너",
        properties: { candidate: "한지우", status: "pending_approval", amount: 82000000, approver: "김수민 (Head of Design)" },
      },
    ],

    // 최근 활동 7건(2026-07-02 ~ 07-08). stage는 타임라인 flow-token 색상에 맞춘 상태값.
    activity: [
      {
        id: "ac700000-0000-4000-8000-000000000001",
        catalogKey: "activity",
        title: "",
        properties: { note: "최유진 오퍼 승인 요청 등록", actor: "박지훈", stage: "pending", createdAt: "2026-07-08" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000002",
        catalogKey: "activity",
        title: "",
        properties: { note: "한지우 오퍼 승인 요청 등록", actor: "김수민", stage: "pending", createdAt: "2026-07-08" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000003",
        catalogKey: "activity",
        title: "",
        properties: { note: "김서연 온사이트 인터뷰 완료", actor: "이가람", stage: "completed", createdAt: "2026-07-07" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000004",
        catalogKey: "activity",
        title: "",
        properties: { note: "정도현 2차 인터뷰 일정 확정", actor: "박지훈", stage: "scheduled", createdAt: "2026-07-06" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000005",
        catalogKey: "activity",
        title: "",
        properties: { note: "박민지 지원서 접수", actor: "채용봇", stage: "submitted", createdAt: "2026-07-05" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000006",
        catalogKey: "activity",
        title: "",
        properties: { note: "신동욱 불합격 처리", actor: "박지훈", stage: "rejected", createdAt: "2026-07-04" },
      },
      {
        id: "ac700000-0000-4000-8000-000000000007",
        catalogKey: "activity",
        title: "",
        properties: { note: "서예린 최종 합격 확정", actor: "이가람", stage: "approved", createdAt: "2026-07-02" },
      },
    ],
  },
} satisfies PageRuntimeDemo;
