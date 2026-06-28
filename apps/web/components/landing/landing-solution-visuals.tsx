import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

/** 공통 비주얼 프레임 — 상단 브라우저 크롬 + 본문 */
function VisualFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * 실제 제품 화면이 들어갈 자리. 디자인 확정 전까지 뚫어두는 placeholder.
 * TODO: 실제 SSOTA 화면 스크린샷/임베드로 교체.
 */
export function LandingProductScreenPlaceholder({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <VisualFrame label={label}>
      <div className="flex min-h-[20rem] items-center justify-center bg-muted/20 p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-12 text-center">
          <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            제품 화면
          </span>
          <p className="text-sm font-medium text-foreground">{caption}</p>
          <p className="text-xs text-muted-foreground">
            실제 화면 연결 예정
          </p>
        </div>
      </div>
    </VisualFrame>
  );
}

const lifecycleStages: ReadonlyArray<{
  stage: string;
  artifacts: string;
}> = [
  { stage: "Executive", artifacts: "OKR · 로드맵" },
  { stage: "Research", artifacts: "유저 리서치 · 가설" },
  { stage: "PM", artifacts: "PRD · 이니셔티브" },
  { stage: "Design", artifacts: "설계 결정 · 플로우" },
  { stage: "Development", artifacts: "테스트 · 배포 런북" },
];

/** ② 흐름 — 제품 생애주기 단계가 다음 단계로 이어지는 플로우 다이어그램 */
export function LandingLifecycleFlow() {
  return (
    <VisualFrame label="product lifecycle graph">
      <div className="bg-muted/10 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0">
          {lifecycleStages.map((item, index) => (
            <div
              key={item.stage}
              className="flex items-center gap-3 md:flex-1 md:flex-col md:items-stretch md:gap-0"
            >
              <div className="flex-1 rounded-xl border bg-background p-4 md:flex md:flex-col md:gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm font-semibold">{item.stage}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.artifacts}
                </p>
              </div>
              {index < lifecycleStages.length - 1 ? (
                <div className="flex shrink-0 items-center justify-center text-primary/60 max-md:rotate-90 md:px-1">
                  <ArrowRightIcon className="size-4" weight="bold" aria-hidden />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          각 단계의 맥락이 다음 단계의 입력으로 이어집니다.
        </p>
      </div>
    </VisualFrame>
  );
}

const mcpAgents: ReadonlyArray<{ name: string; state: string }> = [
  { name: "Cursor", state: "reading" },
  { name: "Claude Code", state: "writing" },
  { name: "Codex", state: "queued" },
];

const externalSources = ["GitHub", "Slack", "Linear", "Notion"];

/** ③ MCP — 중앙 그래프에 에이전트·외부 데이터가 MCP로 연결 */
export function LandingMcpConnections() {
  return (
    <VisualFrame label="MCP connections">
      <div className="grid gap-4 bg-muted/10 p-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:p-8">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Coding agents
          </p>
          {mcpAgents.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <span className="font-medium">{agent.name}</span>
              <span className="text-xs text-primary">{agent.state}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-primary">SSOTA</p>
            <p className="mt-1 text-[10px] text-muted-foreground">context graph</p>
            <p className="mt-2 text-[10px] font-medium text-primary/80">↔ MCP ↔</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            External data
          </p>
          <div className="flex flex-wrap gap-2">
            {externalSources.map((source) => (
              <span
                key={source}
                className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}
