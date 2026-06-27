"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  DecisionControlPlaneMockup,
  ProductWorkspaceMockup,
} from "./product-mockups";
import { SlideFrame, SlidePrintStyles } from "./slide-frame";

const customerSegments = [
  "Claude Code, Cursor, Codex를 병렬로 쓰는 기술 창업자",
  "작은 팀으로 개발과 운영을 동시에 해야 하는 스타트업",
  "여러 클라이언트 프로젝트를 관리하는 개발 외주사/스튜디오",
  "에이전트 결과물 검수와 재정렬 비용이 커진 PM/개발자",
];

const architectureLayers = [
  {
    title: "Web App",
    copy: "사람이 목표, 워크플로우, 승인 기준을 설정하고 산출물을 검토합니다.",
  },
  {
    title: "Workflow Instructions",
    copy: "리서치, PM, 디자인, 개발, 운영 단계별 에이전트 지침을 정의합니다.",
  },
  {
    title: "Decision Graph",
    copy: "요구사항, 정책, 설계, 구현, 테스트 결과를 관계로 연결합니다.",
  },
  {
    title: "MCP Layer",
    copy: "기존 코딩 에이전트가 제품 맥락을 읽고 쓰게 합니다.",
  },
];

const competitionRows = [
  ["PRD generation", "Manyfast, ChatPRD", "산출물 생성 중심"],
  ["Docs", "Notion", "문서 저장 중심"],
  ["Task tracking", "Linear", "실행 상태 중심"],
  ["Agent runners", "Conductor, Multica", "병렬 실행 중심"],
  ["Agent org", "Paperclip", "조직/실행 통제 중심"],
];

const progressItems = [
  "2023년 Pax Humana 첫 시도: agent + knowledge graph",
  "지식그래프 기반 여행비서 에이전트 데모 제작, 수상 및 VC 미팅",
  "2023~2026년 약 80건의 소프트웨어 개발 프로젝트 경험",
  "Claude Code, Cursor, Codex 기반 개발 워크플로우 직접 검증",
  "2026년 6월 10일부터 SSOTA 오픈소스 개발 시작",
  "자체 제품 개발에 dogfooding 중",
];

function StatementCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="bg-card/75">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl leading-tight tracking-[-0.03em]">
          {value}
        </CardTitle>
      </CardHeader>
      {detail ? (
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function StepList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={item} className="flex items-start gap-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="text-lg leading-7">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FlowDiagram() {
  const steps = [
    "User voice",
    "PRD",
    "Policy",
    "Tech design",
    "Code change",
    "Test result",
    "Approved context",
  ];

  return (
    <div className="grid grid-cols-7 items-stretch gap-2">
      {steps.map((step, index) => (
        <div key={step} className="relative">
          <div className="flex h-full min-h-28 flex-col justify-between rounded-lg border border-border bg-card/80 p-4">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-pretty text-sm font-medium">{step}</p>
          </div>
          {index < steps.length - 1 ? (
            <span
              className="absolute right-[-0.75rem] top-1/2 z-10 h-px w-4 bg-primary"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BusinessModelGrid() {
  const models = [
    {
      title: "Open Source Core",
      price: "$0",
      detail: "직접 설치하는 핵심 맥락/워크플로우/MCP 구조",
    },
    {
      title: "Cloud SaaS",
      price: "$20-$199 / user / month",
      detail: "호스팅, 협업, 승인 플로우, 버전 히스토리, 작업 로그",
    },
    {
      title: "Enterprise",
      price: "$20K-$100K+ / year",
      detail: "맞춤 워크플로우, 플러그인, SSO, 감사 로그, 전용 배포",
    },
  ];

  return (
    <div className="grid flex-1 grid-cols-3 gap-5">
      {models.map((model) => (
        <Card key={model.title} className="justify-between bg-card/80">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              {model.title}
            </Badge>
            <CardTitle className="text-3xl tracking-[-0.04em]">
              {model.price}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-7 text-muted-foreground">{model.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PitchDeck() {
  return (
    <div className="pitch-deck-shell min-h-svh bg-muted/50 py-8">
      <SlidePrintStyles />
      <div className="screen-only mx-auto mb-6 flex max-w-[1600px] items-center justify-between px-4">
        <div>
          <p className="text-sm font-medium">Pax Humana / SSOTA pitch deck</p>
          <p className="text-xs text-muted-foreground">
            Use the export script or browser print to generate the PDF.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print deck
        </Button>
      </div>

      <div className="space-y-8 print:space-y-0">
        <SlideFrame
          slideNumber={1}
          eyebrow="Cover"
          title="Pax Humana builds SSOTA, the AI CPO for your Agent Team."
          subtitle="AI 개발 에이전트팀이 제품 의도와 스펙에 맞춰 24/7 안전하게 일하도록 만드는 시스템"
          contentClassName="justify-end"
        >
          <div className="grid grid-cols-[1fr_0.8fr] items-end gap-8">
            <div className="space-y-8">
              <div className="flex flex-wrap gap-3">
                <Badge>Claude Code</Badge>
                <Badge variant="secondary">Cursor</Badge>
                <Badge variant="outline">Codex</Badge>
                <Badge variant="outline">MCP</Badge>
              </div>
              <p className="max-w-3xl text-2xl leading-9">
                코딩 에이전트는 코드를 빠르게 만듭니다. SSOTA는 그
                에이전트들이 제품 의도대로 일하게 만듭니다.
              </p>
            </div>
            <Card className="bg-card/80">
              <CardHeader>
                <CardDescription>Founder</CardDescription>
                <CardTitle>연주환</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>2023년 Pax Humana 창업</p>
                <p>Agent + knowledge graph를 너무 일찍 시작했고, 실패했고, 다시 풉니다.</p>
              </CardContent>
            </Card>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={2}
          eyebrow="Problem"
          title="AI 코딩 에이전트는 더 많은 코드를 만들지만, 더 많은 정렬 문제도 만듭니다."
          subtitle="새 병목은 코드 생성 능력이 아니라 제품 의도, 스펙, 정책, 결정 맥락을 에이전트팀 전체에 유지시키는 능력입니다."
        >
          <div className="grid flex-1 grid-cols-3 gap-5">
            <StatementCard
              label="Before"
              value="구현 속도가 병목"
              detail="사람이 직접 코드를 쓰고 테스트하는 속도가 제품 개발의 상한이었습니다."
            />
            <StatementCard
              label="Now"
              value="정렬 비용이 병목"
              detail="여러 에이전트가 빠르게 작업하지만, 각자 다른 맥락으로 판단할 수 있습니다."
            />
            <StatementCard
              label="Failure mode"
              value="Wrong context ships faster"
              detail="잘못된 요구사항과 오래된 스펙도 코드에 더 빠르게 반영됩니다."
            />
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={3}
          eyebrow="Why now"
          title="2026년의 질문은 누가 코드를 쓰는가가 아니라, 에이전트팀이 어떤 기준으로 판단하는가입니다."
        >
          <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] gap-8">
            <Card className="bg-card/80">
              <CardHeader>
                <CardTitle>What changed</CardTitle>
                <CardDescription>
                  코딩 에이전트와 MCP가 실제 개발 워크플로우로 들어왔습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StepList
                  items={[
                    "한 명의 개발자가 여러 에이전트를 병렬 실행합니다.",
                    "기획, 구현, 테스트, 문서화가 동시에 진행됩니다.",
                    "MCP로 외부 맥락 연결은 쉬워졌습니다.",
                    "하지만 맥락 사이의 관계와 승인 기준은 여전히 흩어져 있습니다.",
                  ]}
                />
              </CardContent>
            </Card>
            <div className="grid content-center gap-4">
              {[
                "More agents",
                "More code",
                "More specs to reconcile",
                "More need for product intent control",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-background p-5 text-2xl font-semibold tracking-[-0.03em]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={4}
          eyebrow="Founder insight"
          title="저는 이 문제를 2023년부터 붙잡고 있었습니다."
          subtitle="Pax Humana는 인간과 AI가 조화롭게 일하는 조직을 만들겠다는 문제의식에서 시작했습니다."
        >
          <div className="grid flex-1 grid-cols-[1fr_1fr] gap-6">
            <Card className="bg-card/80">
              <CardHeader>
                <CardTitle>Too early then</CardTitle>
                <CardDescription>2023년의 첫 시도</CardDescription>
              </CardHeader>
              <CardContent>
                <StepList
                  items={[
                    "AutoGPT와 BabyAGI를 보며 에이전트 시대를 확신했습니다.",
                    "고려대학교 개발자 후배들과 지식그래프 기반 여행비서 에이전트를 만들었습니다.",
                    "데모로 수상하고 VC들을 만났지만, 모델 성능과 컨텍스트 윈도우가 부족했습니다.",
                    "문제를 고객이 돈 낼 만큼 구체화하지 못했고 팀을 접었습니다.",
                  ]}
                />
              </CardContent>
            </Card>
            <Card className="bg-primary/10">
              <CardHeader>
                <CardDescription>What stayed true</CardDescription>
                <CardTitle className="text-4xl leading-tight tracking-[-0.05em]">
                  AI가 일을 하려면, 사람의 의도와 판단 기준이 구조화되어야 합니다.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-8 text-muted-foreground">
                  2023년에는 너무 이른 질문이었지만, 코딩 에이전트가 실제 제품을
                  만들기 시작한 지금은 현실적인 시장 문제가 되었습니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={5}
          eyebrow="Field learning"
          title="이후 2년간 약 80건의 개발 프로젝트에서 같은 문제를 반복해서 봤습니다."
        >
          <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] gap-8">
            <Card className="bg-card/80">
              <CardHeader>
                <CardTitle>Observed across projects</CardTitle>
                <CardDescription>
                  의료 AI, 여행 챗봇, LMS, 저작 SaaS, 마케팅 챗봇 등
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-6xl font-semibold tracking-[-0.06em]">80</p>
                <p className="mt-2 text-lg text-muted-foreground">
                  software projects, 2023-2026
                </p>
              </CardContent>
            </Card>
            <div className="grid content-center gap-4">
              {[
                "고객 요구사항이 스펙으로 번역되는 과정에서 맥락이 손실됩니다.",
                "범위 조율과 의사결정 이력이 코드 변경과 분리됩니다.",
                "테스트와 운영 판단이 원래 제품 의도와 다시 연결되지 않습니다.",
                "AI 에이전트는 이 불일치를 더 빠르게 제품에 반영합니다.",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-card p-5">
                  <p className="text-lg leading-7">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={6}
          eyebrow="Solution"
          title="SSOTA is the AI CPO loop for software development agents."
          subtitle="에이전트는 맥락을 읽고, 스펙에 맞춰 작업하고, 근거를 남깁니다. 사람은 최종 승인권자로 제품 방향을 통제합니다."
        >
          <div className="grid flex-1 grid-cols-5 gap-3">
            {[
              ["Set intent", "제품 목표와 승인 기준을 설정"],
              ["Read context", "에이전트가 요구사항, 정책, 설계를 읽음"],
              ["Do work", "코드, 문서, 테스트를 수행"],
              ["Write evidence", "구현 결과와 판단 근거를 기록"],
              ["Approve", "사람이 다음 맥락으로 승인"],
            ].map(([title, copy], index) => (
              <Card key={title} className="justify-between bg-card/80">
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    {String(index + 1).padStart(2, "0")}
                  </Badge>
                  <CardTitle className="text-2xl tracking-[-0.04em]">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={7}
          eyebrow="Product architecture"
          title="Four layers keep agent work aligned with product intent."
        >
          <div className="grid flex-1 grid-cols-4 gap-5">
            {architectureLayers.map((layer, index) => (
              <Card key={layer.title} className="bg-card/80">
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    Layer {index + 1}
                  </Badge>
                  <CardTitle className="text-2xl tracking-[-0.04em]">
                    {layer.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-7 text-muted-foreground">
                    {layer.copy}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={8}
          eyebrow="Workflow"
          title="A task is not just assigned. It is grounded in a chain of product decisions."
          subtitle="회원가입 이메일 인증 로직을 수정하는 에이전트는 코드만 보지 않습니다."
        >
          <div className="flex flex-1 flex-col justify-center gap-8">
            <FlowDiagram />
            <Card className="bg-card/80">
              <CardContent className="grid grid-cols-3 gap-5 p-6">
                {[
                  "어떤 고객 요구사항에서 시작됐는가",
                  "어떤 PRD와 정책을 따라야 하는가",
                  "작업 후 어떤 판단 근거를 남겨야 하는가",
                ].map((item) => (
                  <p key={item} className="text-lg leading-7">
                    {item}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={9}
          eyebrow="Product shot"
          title="The deck uses the same UI catalog components as the product runtime."
          subtitle="아래 화면은 이미지 캡처가 아니라 실제 json-render catalog 컴포넌트를 슬라이드 안에서 렌더링한 것입니다."
          contentClassName="min-h-0"
        >
          <ProductWorkspaceMockup />
        </SlideFrame>

        <SlideFrame
          slideNumber={10}
          eyebrow="Control plane"
          title="SSOTA turns agent output into approved product memory."
          subtitle="작업 결과는 채팅 로그가 아니라 다음 에이전트가 재사용할 수 있는 의사결정 근거가 됩니다."
          contentClassName="min-h-0"
        >
          <DecisionControlPlaneMockup />
        </SlideFrame>

        <SlideFrame
          slideNumber={11}
          eyebrow="Initial customer"
          title="The first users already feel the pain because they already use coding agents."
        >
          <div className="grid flex-1 grid-cols-[1fr_0.9fr] gap-8">
            <div className="grid content-center gap-4">
              {customerSegments.map((segment) => (
                <div key={segment} className="rounded-lg border border-border bg-card p-5">
                  <p className="text-lg leading-7">{segment}</p>
                </div>
              ))}
            </div>
            <Card className="justify-center bg-primary/10">
              <CardHeader>
                <CardDescription>Buying trigger</CardDescription>
                <CardTitle className="text-4xl leading-tight tracking-[-0.05em]">
                  에이전트를 더 많이 쓰고 싶은데, 제품 의도에서 벗어나는 것이 두렵다.
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </SlideFrame>

        <SlideFrame
          slideNumber={12}
          eyebrow="Business model"
          title="Open-source core, cloud SaaS, and enterprise workflow build."
          contentClassName="min-h-0"
        >
          <BusinessModelGrid />
        </SlideFrame>

        <SlideFrame
          slideNumber={13}
          eyebrow="Competition"
          title="We are not a document generator or an agent runner. We are the product decision context layer."
        >
          <Card className="bg-card/80">
            <CardContent className="p-0">
              <div className="grid grid-cols-[0.75fr_1fr_1.05fr_1fr] border-b border-border bg-muted/50 px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                <span>Category</span>
                <span>Examples</span>
                <span>Limit</span>
                <span>SSOTA</span>
              </div>
              {competitionRows.map(([category, examples, limit]) => (
                <div
                  key={category}
                  className="grid grid-cols-[0.75fr_1fr_1.05fr_1fr] border-b border-border px-5 py-4 text-sm last:border-b-0"
                >
                  <span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">{examples}</span>
                  <span>{limit}</span>
                  <span className="font-medium text-primary">
                    제품 의도와 결정 관계 관리
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </SlideFrame>

        <SlideFrame
          slideNumber={14}
          eyebrow="Progress"
          title="The company is early, but the problem is earned."
          subtitle="현재 핵심 지표는 매출보다 오픈소스 개발 시작, 실제 프로젝트 경험, 에이전트 개발 워크플로우 검증입니다."
        >
          <div className="grid flex-1 grid-cols-2 gap-8">
            <Card className="bg-card/80">
              <CardHeader>
                <CardTitle>Current proof</CardTitle>
                <CardDescription>What has been learned and built</CardDescription>
              </CardHeader>
              <CardContent>
                <StepList items={progressItems} />
              </CardContent>
            </Card>
            <Card className="justify-center bg-card/80">
              <CardHeader>
                <CardDescription>Why me</CardDescription>
                <CardTitle className="text-4xl leading-tight tracking-[-0.05em]">
                  저는 이 문제를 너무 일찍 시작했고, 실패했고, 그래도 놓지 않았습니다.
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-lg leading-8 text-muted-foreground">
                <p>
                  축구선수 출신으로 전국대회 우승과 MVP를 경험했고, SF와 우주를
                  좋아해 세상을 바꾸는 엔지니어가 되고 싶어 축구를 그만뒀습니다.
                </p>
                <p>
                  Pax Humana는 2023년에 너무 일찍 시작했던 문제를 지금의 에이전트
                  시대에 맞게 다시 푸는 회사입니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </SlideFrame>
      </div>
    </div>
  );
}
