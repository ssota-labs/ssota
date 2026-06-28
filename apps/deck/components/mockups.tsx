"use client";

/**
 * 제품 화면 mockup — 실제 @ssota/ui 컴포넌트(Badge/Avatar/Button 등)와
 * 동일한 시맨틱 토큰으로 구성해 "실제 스크린샷" 느낌을 낸다.
 * 슬라이드에서 BrowserFrame 으로 감싸 콘솔 캡처처럼 배치한다.
 */
import * as React from "react";
import {
  FileTextIcon,
  KanbanIcon,
  ChatCircleDotsIcon,
  PlugsConnectedIcon,
  ClockCountdownIcon,
  CaretDownIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  GraphIcon,
  SparkleIcon,
  ArrowRightIcon,
  CircleNotchIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

/* ───────────────────────── BrowserFrame ───────────────────────── */

export function BrowserFrame({
  url = "app.ssota.dev",
  children,
  className,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-30px_rgb(0_0_0_/_0.35)]",
        className,
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-muted/60 px-3.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.16_25)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.83_0.15_85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_150)]" />
        </div>
        <div className="flex h-5 flex-1 items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 text-[11px] text-muted-foreground">
          <PlugsConnectedIcon size={11} className="text-primary" weight="bold" />
          {url}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">{children}</div>
    </div>
  );
}

/* ───────────────────────── Console / Workspace ───────────────────────── */

const NAV = [
  { icon: FileTextIcon, label: "Pages", active: true },
  { icon: KanbanIcon, label: "Tasks" },
  { icon: ChatCircleDotsIcon, label: "Chat" },
  { icon: PlugsConnectedIcon, label: "Connectors" },
  { icon: ClockCountdownIcon, label: "Schedules" },
];

const TREE = [
  { label: "경영진", depth: 0 },
  { label: "리서치", depth: 0 },
  { label: "PM", depth: 0, open: true },
  { label: "온보딩 개선 PRD", depth: 1, active: true },
  { label: "결제 전환 이니셔티브", depth: 1 },
  { label: "디자인", depth: 0 },
  { label: "개발", depth: 0 },
];

export function ConsoleWorkspace() {
  return (
    <div className="flex h-full w-full text-[12px]">
      {/* Sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            S
          </div>
          <span className="text-[13px] font-semibold tracking-tight">ssota-labs</span>
          <CaretDownIcon size={12} className="ml-auto text-muted-foreground" />
        </div>
        <nav className="px-2">
          {NAV.map((n) => (
            <div
              key={n.label}
              className={cn(
                "mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5",
                n.active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <n.icon size={15} weight={n.active ? "fill" : "regular"} className={n.active ? "text-primary" : ""} />
              {n.label}
            </div>
          ))}
        </nav>
        <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workflows
        </div>
        <div className="px-2">
          {TREE.map((t, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1 pr-2 text-[12px]",
                t.active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground",
              )}
              style={{ paddingLeft: 8 + t.depth * 14 }}
            >
              {t.depth === 0 ? (
                t.open ? <CaretDownIcon size={11} /> : <CaretRightIcon size={11} />
              ) : (
                <FileTextIcon size={12} className={t.active ? "text-primary" : ""} />
              )}
              {t.label}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-sidebar-border px-3 py-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
            JY
          </div>
          <span className="truncate text-[11px] text-muted-foreground">joo@ssota.ai</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center gap-2 border-b border-border px-5">
          <span className="text-[12px] text-muted-foreground">PM</span>
          <CaretRightIcon size={11} className="text-muted-foreground" />
          <span className="text-[12px] font-medium">온보딩 개선 PRD</span>
          <Badge variant="secondary" className="ml-2 gap-1 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.15_85)]" /> In Review
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {["C", "Cu", "Cx"].map((a) => (
                <span
                  key={a}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-secondary text-[9px] font-semibold"
                >
                  {a}
                </span>
              ))}
            </div>
            <button className="cn-button flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground">
              <CheckCircleIcon size={13} weight="fill" /> 승인
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden px-8 py-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Product Requirements</div>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight">첫 프로젝트 생성 온보딩 개선</h1>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Owner · PM agent</span>
            <span>·</span>
            <span>Updated 2분 전</span>
            <span>·</span>
            <Badge variant="outline" className="text-[10px]">v3</Badge>
          </div>

          <div className="mt-5 space-y-4">
            <DocSection title="문제 정의">
              가입 직후 첫 성공 경험(첫 프로젝트 생성)까지의 시간이 길어 신규 사용자의 이탈이
              발생한다. 리서치 워크플로우의 유저 보이스 12건에서 동일 패턴이 확인됨.
            </DocSection>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <SparkleIcon size={13} weight="fill" /> 성공 지표
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                D1 활성화율 +12%p · 첫 프로젝트 생성까지 중앙값 8분 → 3분
              </div>
            </div>
            <DocSection title="범위 / 정책">
              온보딩 3단계를 1단계 템플릿 선택으로 축소한다. 이메일 인증은 비차단(soft) 정책을
              따르며 결제 연결은 범위에서 제외한다.
            </DocSection>
          </div>
        </div>
      </div>

      {/* Right rail — decision graph context */}
      <aside className="flex w-60 shrink-0 flex-col border-l border-border bg-muted/30">
        <div className="flex items-center gap-1.5 px-3.5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <GraphIcon size={13} className="text-primary" weight="bold" /> Decision Graph
        </div>
        <div className="space-y-2 px-3">
          {[
            { type: "유저 보이스", rel: "근거", title: "온보딩 중 이탈 ×12" },
            { type: "제품 가설", rel: "도출", title: "첫 성공까지 시간 과다" },
            { type: "디자인 / IA", rel: "의존", title: "템플릿 선택 플로우" },
            { type: "기술 설계", rel: "의존", title: "auth soft-verify API" },
            { type: "테스트 기준", rel: "검증", title: "활성화 회귀 스위트" },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[9px]">{c.type}</Badge>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.rel}</span>
              </div>
              <div className="mt-1.5 text-[11px] font-medium leading-snug">{c.title}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] font-semibold">{title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

/* ───────────────────────── Decision Graph (SVG) ───────────────────────── */

type GNode = { id: string; x: number; y: number; type: string; label: string; lane: string };

const G_NODES: GNode[] = [
  { id: "uv", x: 40, y: 60, type: "리서치", label: "유저 보이스", lane: "RESEARCH" },
  { id: "hp", x: 40, y: 170, type: "리서치", label: "제품 가설", lane: "RESEARCH" },
  { id: "init", x: 300, y: 115, type: "PM", label: "이니셔티브", lane: "PM" },
  { id: "prd", x: 300, y: 235, type: "PM", label: "PRD · 정책", lane: "PM" },
  { id: "ia", x: 560, y: 60, type: "디자인", label: "IA / 컴포넌트", lane: "DESIGN" },
  { id: "tech", x: 560, y: 190, type: "개발", label: "기술 설계 · API", lane: "DEV" },
  { id: "impl", x: 820, y: 190, type: "개발", label: "구현 결과", lane: "DEV" },
  { id: "test", x: 820, y: 310, type: "개발", label: "테스트 결과", lane: "DEV" },
];

const G_EDGES: [string, string, string][] = [
  ["uv", "hp", "근거"],
  ["hp", "init", "도출"],
  ["init", "prd", "구체화"],
  ["prd", "ia", "의존"],
  ["prd", "tech", "제약"],
  ["tech", "impl", "구현"],
  ["impl", "test", "검증"],
];

const LANE_COLOR: Record<string, string> = {
  리서치: "oklch(0.7 0.13 250)",
  PM: "var(--primary)",
  디자인: "oklch(0.68 0.15 320)",
  개발: "oklch(0.7 0.14 160)",
};

const NW = 150;
const NH = 64;

export function DecisionGraph() {
  const nodeById: Record<string, GNode> = Object.fromEntries(
    G_NODES.map((n) => [n.id, n]),
  );
  return (
    <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] bg-[size:22px_22px] p-4">
      <svg viewBox="0 0 1010 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--muted-foreground)" />
          </marker>
        </defs>
        {G_EDGES.map(([from, to, label], i) => {
          const a = nodeById[from]!;
          const b = nodeById[to]!;
          const x1 = a.x + NW;
          const y1 = a.y + NH / 2;
          const x2 = b.x;
          const y2 = b.y + NH / 2;
          const mx = (x1 + x2) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 8} ${y2}`}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeOpacity={0.55}
                markerEnd="url(#arrow)"
              />
              <text
                x={mx}
                y={(y1 + y2) / 2 - 5}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {label}
              </text>
            </g>
          );
        })}
        {G_NODES.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={NW}
              height={NH}
              rx={10}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1}
            />
            <rect x={n.x} y={n.y} width={4} height={NH} rx={2} fill={LANE_COLOR[n.type]} />
            <text x={n.x + 16} y={n.y + 24} style={{ fontSize: 10, letterSpacing: 0.4 }} fill="var(--muted-foreground)">
              {n.type.toUpperCase()}
            </text>
            <text x={n.x + 16} y={n.y + 44} style={{ fontSize: 14, fontWeight: 600 }} fill="var(--foreground)">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ───────────────────────── Agent Tasks (Kanban) ───────────────────────── */

type TaskCard = {
  title: string;
  flow: string;
  agent: string;
  running?: boolean;
};

const COLUMNS: { name: string; tone: string; tasks: TaskCard[] }[] = [
  {
    name: "Backlog",
    tone: "oklch(0.7 0.02 250)",
    tasks: [
      { title: "경쟁사 온보딩 분석", flow: "리서치", agent: "Claude" },
      { title: "결제 전환 PRD 초안", flow: "PM", agent: "Codex" },
    ],
  },
  {
    name: "In Progress",
    tone: "oklch(0.78 0.15 85)",
    tasks: [
      { title: "이메일 인증 로직 수정", flow: "개발", agent: "Cursor", running: true },
      { title: "온보딩 IA 와이어프레임", flow: "디자인", agent: "Claude", running: true },
    ],
  },
  {
    name: "Review",
    tone: "oklch(0.7 0.13 250)",
    tasks: [{ title: "활성화 지표 대시보드", flow: "개발", agent: "Codex" }],
  },
  {
    name: "Done",
    tone: "oklch(0.7 0.14 160)",
    tasks: [
      { title: "유저 보이스 수집", flow: "리서치", agent: "Claude" },
      { title: "성공 지표 정의", flow: "PM", agent: "Cursor" },
    ],
  },
];

const FLOW_COLOR: Record<string, string> = {
  리서치: "oklch(0.7 0.13 250)",
  PM: "var(--primary)",
  디자인: "oklch(0.68 0.15 320)",
  개발: "oklch(0.7 0.14 160)",
};

export function AgentTasks() {
  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-11 items-center gap-2 border-b border-border px-5">
        <KanbanIcon size={16} className="text-primary" weight="fill" />
        <span className="text-[13px] font-semibold">Agent Tasks</span>
        <Badge variant="secondary" className="text-[10px]">7 active</Badge>
        <div className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
          <MagnifyingGlassIcon size={12} /> 워크플로우별
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3 p-4">
        {COLUMNS.map((col) => (
          <div key={col.name} className="flex min-h-0 flex-col">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full" style={{ background: col.tone }} />
              <span className="text-[11px] font-semibold">{col.name}</span>
              <span className="text-[10px] text-muted-foreground">{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {col.tasks.map((t) => (
                <div key={t.title} className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium leading-snug">{t.title}</span>
                    <DotsThreeIcon size={14} className="shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
                      style={{ background: FLOW_COLOR[t.flow] }}
                    >
                      {t.flow}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {t.running && (
                        <CircleNotchIcon size={11} className="animate-spin text-primary" weight="bold" />
                      )}
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[8px] font-bold">
                        {t.agent[0]}
                      </span>
                      {t.agent}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Chat + Connections (MCP) ───────────────────────── */

export function ChatConnections() {
  return (
    <div className="flex h-full w-full">
      {/* Chat thread */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-border">
        <header className="flex h-11 items-center gap-2 border-b border-border px-5">
          <ChatCircleDotsIcon size={16} className="text-primary" weight="fill" />
          <span className="text-[13px] font-semibold">에이전트 작업 — 온보딩 개선</span>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-5 py-4">
          <Bubble role="user">회원가입 플로우의 이메일 인증 로직을 정책에 맞게 수정해줘.</Bubble>
          <Bubble role="agent">
            <div className="mb-2 text-[12px]">작업 전 SSOTA 그래프에서 맥락을 읽었습니다:</div>
            <div className="space-y-1">
              <ToolCall icon={FileTextIcon} label='read_node "온보딩 개선 PRD" · v3' />
              <ToolCall icon={GraphIcon} label="traverse_edges → soft-verify 정책 · 디자인 IA" />
              <ToolCall icon={GithubLogoIcon} label="auth/verify-email.ts 수정 · 테스트 통과" />
              <ToolCall icon={CheckCircleIcon} label='create_node "구현 결과" → PRD 에 연결' done />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary">
              <ArrowRightIcon size={12} weight="bold" /> 사람 승인 대기 — 판단 근거 기록 완료
            </div>
          </Bubble>
        </div>
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            <SparkleIcon size={14} className="text-primary" />
            맥락을 읽고 근거를 남기는 작업 지시…
          </div>
        </div>
      </div>

      {/* Connections (MCP) */}
      <aside className="flex w-72 shrink-0 flex-col bg-muted/30">
        <div className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          MCP Connectors
        </div>
        <div className="space-y-2 px-3">
          {[
            { name: "Claude Code", sub: "ssota-mcp · 8 tools", on: true },
            { name: "Cursor", sub: "ssota-mcp · 8 tools", on: true },
            { name: "Codex", sub: "ssota-mcp · 8 tools", on: true },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                {c.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.sub}</div>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-[oklch(0.6_0.14_160)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.14_160)]" /> 연결됨
              </span>
            </div>
          ))}
          <div className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            데이터 소스
          </div>
          {["GitHub", "Notion", "Slack"].map((c) => (
            <div key={c} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-[11px] font-bold">
                {c[0]}
              </div>
              <div className="text-[12px] font-medium">{c}</div>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.14_160)]" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "agent"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12px]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ToolCall({
  icon: Icon,
  label,
  done,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; weight?: "fill" | "bold" | "regular" }>;
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px]">
      <Icon size={13} className={done ? "text-[oklch(0.6_0.14_160)]" : "text-muted-foreground"} weight="bold" />
      <span className="font-mono text-[10.5px] text-foreground/80">{label}</span>
    </div>
  );
}
