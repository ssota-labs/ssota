import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { getCurrentUser } from "@/lib/supabase/server";
import { LandingHeroPrompt } from "@/components/landing/landing-hero-prompt";
import { LandingProblemWave } from "@/components/landing/landing-problem-wave";

export const metadata: Metadata = {
  title: "SSOTA - 제품을 제대로 아는 AI",
  description:
    "코딩 에이전트가 제품 맥락을 이해하고 움직이게 하는 AI CPO 레이어.",
};

const workflowLayers = [
  {
    label: "Executive",
    title: "목표와 우선순위",
    detail: "로드맵, OKR, 핵심 지표, 사업 의사결정을 에이전트가 읽는 기준으로 만듭니다.",
  },
  {
    label: "Research",
    title: "고객 요구와 가설",
    detail: "유저 보이스와 시장 리서치를 제품 가설과 문제 정의로 연결합니다.",
  },
  {
    label: "PM",
    title: "스펙과 정책",
    detail: "PRD, 기능 정책, 성공 지표, 승인 기준을 다음 작업의 SSOT로 관리합니다.",
  },
  {
    label: "Design",
    title: "흐름과 화면 결정",
    detail: "IA, 유저 플로우, 화면 정책, 컴포넌트 기준을 구현 맥락으로 남깁니다.",
  },
  {
    label: "Development",
    title: "설계와 검증",
    detail: "기술 설계, API, 테스트 결과, 운영 판단을 다시 제품 결정에 연결합니다.",
  },
];

const loopSteps = [
  "작업 전 관련 스펙과 결정 읽기",
  "Claude Code, Cursor, Codex가 구현 수행",
  "테스트 결과와 판단 근거 기록",
  "사람이 승인한 맥락만 다음 에이전트가 재사용",
];

const differentiators = [
  {
    title: "PRD 생성기가 아닙니다",
    detail:
      "산출물 생성 이후에도 요구사항, 정책, 구현, 테스트 결과의 관계와 유효성을 유지합니다.",
  },
  {
    title: "태스크 트래커가 아닙니다",
    detail:
      "태스크 상태가 아니라 그 태스크가 따라야 할 제품 의도와 승인 기준을 관리합니다.",
  },
  {
    title: "코딩 에이전트를 대체하지 않습니다",
    detail:
      "기존 Claude Code, Cursor, Codex가 MCP로 읽고 쓸 수 있는 CPO 레이어가 됩니다.",
  },
];

const previewNav = ["Executive", "Research", "PM", "Design", "Development"];

export default async function HomePage() {
  const user = await getCurrentUser();
  const appHref = user ? await resolvePostAuthPath(user.id) : "/login";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background/20 backdrop-blur-xl supports-backdrop-filter:bg-background/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SSOTA
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#problem" className="transition-colors hover:text-foreground">
              Problem
            </a>
            <a href="#loop" className="transition-colors hover:text-foreground">
              Agent loop
            </a>
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#difference" className="transition-colors hover:text-foreground">
              Difference
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href="/login" />}
              variant="ghost"
              size="sm"
              nativeButton={false}
            >
              Sign in
            </Button>
            <Button
              render={<Link href={appHref} />}
              size="sm"
              nativeButton={false}
            >
              {user ? "Open console" : "Start"}
            </Button>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b">
        <Image
          src="/landing/hero-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-background/40"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/45 to-background"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-6 py-16 lg:py-20">
          <div className="mx-auto flex w-full flex-col items-center gap-8">
            <div className="max-w-2xl space-y-4 text-center">
              <Badge variant="outline" className="border-border/50 bg-background/50 backdrop-blur-sm">
                AI CPO for coding agents
              </Badge>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                  제품을 제대로 아는 AI
                </h1>
                <p className="mx-auto max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
                  코딩 에이전트가 제품 맥락을 이해해야, 24시간 믿고 맡길 수
                  있습니다.
                </p>
              </div>
            </div>

            <div className="flex min-h-14 w-full items-center justify-center">
              <LandingHeroPrompt href={appHref} />
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="border-b bg-background">
        <div className="mx-auto flex min-h-[min(72vh,44rem)] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold leading-[1.25] tracking-tight text-balance md:text-5xl md:leading-[1.2] lg:text-[3.25rem]">
            <span className="block text-muted-foreground">
              분명히 코딩 에이전트를 늘렸는데,
            </span>
            <span className="mt-4 block text-foreground">
              왜 우리 팀은 같은 제품 실수를 반복하죠?
            </span>
          </h2>
          <LandingProblemWave />
        </div>
      </section>

      <section id="workspace" className="border-b bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">
              맥락이 흩어지면, 에이전트도 각자 다르게 움직입니다.
            </h2>
            <p className="leading-7 text-muted-foreground">
              PRD, 정책, 디자인 결정, API 설계가 서로 다른 도구에 흩어져 있으면
              병렬 에이전트는 빠르게 잘못된 방향으로 갑니다. SSOTA는 승인된
              제품 맥락을 한곳에 모읍니다.
            </p>
          </div>

          <LandingProductPreview appHref={appHref} />
        </div>
      </section>

      <section id="loop" className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <Badge variant="outline" className="bg-background">
              Closed loop
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight">
              작업 전에는 맥락을 읽고, 작업 후에는 근거를 남깁니다.
            </h2>
            <p className="leading-7 text-muted-foreground">
              사람은 모든 문서를 직접 쓰는 사람이 아니라 최종 승인권자가
              됩니다. 승인된 근거만 다음 에이전트의 유효한 맥락이 됩니다.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {loopSteps.map((step, index) => (
              <Card key={step} className="relative overflow-hidden bg-background">
                <CardHeader>
                  <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-full border bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <CardTitle>{step}</CardTitle>
                  <CardDescription>
                    {index === 0
                      ? "요구사항, PRD, 정책, 디자인 결정, 기술 설계를 관계 엣지로 추적합니다."
                      : index === 1
                        ? "기존 개발 환경의 에이전트가 MCP로 필요한 맥락을 가져갑니다."
                        : index === 2
                          ? "코드 변경뿐 아니라 어떤 기준을 반영했는지 함께 기록합니다."
                          : "웹 화면에서 승인된 결과만 다음 작업의 기준으로 이어집니다."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <Badge variant="secondary">Workflow graph</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">
              제품 생애주기 전체를 하나의 의사결정 그래프로 연결합니다.
            </h2>
            <p className="leading-7 text-muted-foreground">
              SSOTA는 문서를 폴더처럼 쌓지 않습니다. 고객 요구, 제품 가설,
              PRD, 정책, 디자인 결정, 기술 설계, 테스트 결과를 의미 있는
              관계로 연결합니다.
            </p>
          </div>
          <div className="grid gap-3">
            {workflowLayers.map((layer) => (
              <Card key={layer.label} className="bg-card/70">
                <CardContent className="grid gap-3 p-4 md:grid-cols-[10rem_1fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-semibold">{layer.label}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{layer.title}</p>
                    <p className="text-sm text-muted-foreground">{layer.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="difference" className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl space-y-4">
            <Badge variant="outline" className="bg-background">
              Difference
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight">
              더 많은 에이전트가 아니라, 같은 기준으로 움직이는 에이전트팀.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {differentiators.map((item) => (
              <Card key={item.title} className="bg-background">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="rounded-2xl border bg-card p-8 shadow-sm md:p-12">
          <Badge variant="secondary">SaaS + partner setup</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            기존 에이전트 개발 워크플로우 위에 AI CPO 레이어를 연결하세요.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
            초기에는 팀의 문서 구조와 승인 프로세스를 함께 세팅하고, 반복되는
            워크플로우와 지침을 클라우드 SaaS 기능으로 표준화합니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              render={<Link href={appHref} />}
              size="lg"
              nativeButton={false}
              className="h-10 px-5 text-sm"
            >
              {user ? "Open console" : "Start with SSOTA"}
            </Button>
            <Button
              render={<Link href="/login" />}
              variant="outline"
              size="lg"
              nativeButton={false}
              className="h-10 px-5 text-sm"
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingProductPreview({ appHref }: { appHref: string }) {
  return (
    <section
      aria-label="SSOTA workspace preview"
      className="relative hidden items-center lg:flex"
    >
      <div className="w-[118%] min-w-[46rem] origin-left scale-[1.02] rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
          <Badge variant="secondary">agent team control plane</Badge>
        </div>
        <div className="grid min-h-[34rem] grid-cols-[13rem_1fr] overflow-hidden rounded-b-2xl">
          <aside className="border-r bg-muted/40 p-4">
            <div className="mb-6">
              <p className="text-xs font-medium text-muted-foreground">Workspace</p>
              <p className="mt-1 font-semibold">ssota-dev</p>
            </div>
            <div className="space-y-1">
              {previewNav.map((item, index) => (
                <div
                  key={item}
                  className={
                    index === 2
                      ? "rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm"
                      : "rounded-lg px-3 py-2 text-sm text-muted-foreground"
                  }
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">MCP agents</p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Cursor</span>
                  <span className="text-primary">reading</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Claude Code</span>
                  <span className="text-primary">writing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Codex</span>
                  <span className="text-muted-foreground">queued</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-4 bg-background p-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  PM workflow
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Onboarding activation initiative
                </h2>
              </div>
              <Button
                render={<Link href={appHref} />}
                size="sm"
                nativeButton={false}
              >
                Review
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle>Intent control loop</CardTitle>
                  <CardDescription>
                    Every agent run starts from approved product context and ends
                    with reviewable evidence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ["Read", "User voice -> PRD -> policy -> API design"],
                    ["Build", "Parallel agents implement against approved spec"],
                    ["Write back", "Tests, decisions, and tradeoffs update graph"],
                    ["Approve", "Human CPO accepts or asks for revision"],
                  ].map(([label, detail]) => (
                    <div key={label} className="rounded-lg border bg-background p-3">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Approval queue</CardTitle>
                    <CardDescription>
                      Only approved decisions become reusable context.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-lg border bg-primary/10 p-3">
                      <p className="font-medium text-primary">Needs review</p>
                      <p className="mt-1 text-muted-foreground">
                        Email verification flow policy changed after test failure.
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="font-medium">Approved context</p>
                      <p className="mt-1 text-muted-foreground">
                        First project creation is the activation moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Decision graph</CardTitle>
                    <CardDescription>
                      User voice, spec, design, code, and tests stay connected.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {["Voice", "Hypothesis", "PRD", "Design", "API", "Tests"].map(
                        (node) => (
                          <div
                            key={node}
                            className="rounded-md border bg-muted/30 px-2 py-2 text-center"
                          >
                            {node}
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
