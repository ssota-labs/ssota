import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwiseIcon,
  FileDashedIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { getCurrentUser } from "@/lib/supabase/server";
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";
import { LandingDarkMode } from "@/components/landing/landing-dark-mode";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeatureShowcase } from "@/components/landing/landing-feature-showcase";
import { LandingHeroPrompt } from "@/components/landing/landing-hero-prompt";
import { LandingPricing } from "@/components/landing/landing-pricing";

export const metadata: Metadata = {
  title: "SSOTA - 제품을 완벽히 아는 AI CPO",
  description:
    "코딩 에이전트가 제품 맥락을 이해하고 움직이게 하는 AI CPO 레이어.",
};

const problemCards: ReadonlyArray<{
  title: string;
  detailLines: readonly string[];
  highlights: readonly string[];
  icon: Icon;
}> = [
  {
    title: "뭐가 맞는지 모릅니다",
    detailLines: [
      "PRD, 슬랙, Notion, 레포… 다 있는데,",
      "뭐가 최신인지 모릅니다.",
      "이 작업에 뭘 참고해야 하는지도 정해져 있지 않습니다.",
    ],
    highlights: ["뭐가 최신인지", "뭘 참고해야 하는지"],
    icon: FileDashedIcon,
  },
  {
    title: "에이전트는 엇갈립니다",
    detailLines: [
      "에이전트마다 다른 조각만 읽습니다.",
      "그래서 비슷한 일을 시켜도 결과가 엇갈립니다.",
    ],
    highlights: ["다른 조각만", "엇갈립니다"],
    icon: TreeStructureIcon,
  },
  {
    title: "맞춰 주는 일이 늘었습니다",
    detailLines: [
      "프롬프트 보강, 리뷰, 재설명.",
      "코딩 대신 의도를 맞추느라 바빠집니다.",
    ],
    highlights: ["프롬프트 보강", "의도를 맞추느라"],
    icon: ArrowsClockwiseIcon,
  },
];

function renderHighlightedDetail(
  text: string,
  highlights: readonly string[],
): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliestIndex = -1;
    let matchedHighlight = "";

    for (const highlight of highlights) {
      const index = remaining.indexOf(highlight);
      if (index !== -1 && (earliestIndex === -1 || index < earliestIndex)) {
        earliestIndex = index;
        matchedHighlight = highlight;
      }
    }

    if (earliestIndex === -1) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {remaining}
        </span>,
      );
      break;
    }

    if (earliestIndex > 0) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {remaining.slice(0, earliestIndex)}
        </span>,
      );
    }

    parts.push(
      <span key={key++} className="font-semibold text-foreground">
        {matchedHighlight}
      </span>,
    );
    remaining = remaining.slice(earliestIndex + matchedHighlight.length);
  }

  return parts;
}

function renderHighlightedDetailLines(
  lines: readonly string[],
  highlights: readonly string[],
): ReactNode {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? (
        <>
          <br className="md:hidden" />
          <span className="hidden md:inline"> </span>
        </>
      ) : null}
      {renderHighlightedDetail(line, highlights)}
    </Fragment>
  ));
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const appHref = user ? await resolvePostAuthPath(user.id) : "/login";

  return (
    <main className="dark min-h-screen overflow-hidden bg-background text-foreground">
      <LandingDarkMode />
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background/20 backdrop-blur-xl supports-backdrop-filter:bg-background/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md"
              aria-hidden
            >
              {/* 로고: public/landing/logo.svg 등으로 교체 */}
            </span>
            SSOTA
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#problem" className="transition-colors hover:text-foreground">
              Problem
            </a>
            <a href="#solution" className="transition-colors hover:text-foreground">
              무엇이 다른가
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              가격
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
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

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src="/landing/hero-background.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover object-center blur-sm"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-background/40 backdrop-blur-sm"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/45 to-background"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-6 py-16 lg:py-20">
          <div className="mx-auto flex w-full flex-col items-center gap-12 md:gap-16">
            <div className="max-w-2xl space-y-4 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                제품을 완벽히 아는 AI CPO
              </h1>
              <p className="mx-auto text-base leading-7 text-muted-foreground md:text-lg md:whitespace-nowrap">
                코딩 에이전트에게 제품 맥락을 이해시켜야, 24시간 믿고 맡길 수 있습니다.
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-6">
              <LandingHeroPrompt />
              <Badge
                variant="outline"
                className="border-border/50 bg-background/50 backdrop-blur-sm"
              >
                7월 중 오픈 예정
              </Badge>
              <LandingBetaSignup triggerClassName="h-11 px-6 text-sm" />
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="bg-background">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-32 md:py-40">
          <h2 className="text-center text-3xl font-semibold leading-[1.25] tracking-tight text-balance md:text-5xl md:leading-[1.2] lg:text-[3.25rem]">
            <span className="block text-muted-foreground">
              분명히 코딩 에이전트를 늘렸는데,
            </span>
            <span className="mt-4 block text-foreground">
              우리 팀은 왜 똑같이 일하죠?
            </span>
          </h2>

          <div className="mt-14 grid w-full gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
            {problemCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.title}
                  className="border-border/60 bg-card/50 text-left shadow-none"
                >
                  <CardHeader className="gap-3">
                    <Icon
                      className="mb-4 size-7 text-muted-foreground"
                      weight="light"
                      aria-hidden
                    />
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription className="text-base leading-7">
                      {renderHighlightedDetailLines(
                        card.detailLines,
                        card.highlights,
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="solution" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold leading-[1.25] tracking-tight text-balance md:text-5xl md:leading-[1.2]">
            AI 시대의 새로운 제품 개발 방식.
          </h2>

          <LandingFeatureShowcase />
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

      <LandingPricing />
      <LandingFaq />
    </main>
  );
}
