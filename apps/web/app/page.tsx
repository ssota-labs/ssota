import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";
import { LandingDarkMode } from "@/components/landing/landing-dark-mode";
import { LandingHeroPrompt } from "@/components/landing/landing-hero-prompt";

export const metadata: Metadata = {
  title: "SSOTA - 제품을 완벽히 아는 AI CPO",
  description:
    "코딩 에이전트가 제품 맥락을 이해하고 움직이게 하는 AI CPO 레이어.",
};

export default function HomePage() {
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
            />
            SSOTA
          </Link>
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
              <Badge
                variant="outline"
                className="border-border/50 bg-background/50 backdrop-blur-sm"
              >
                7월 중 오픈 예정
              </Badge>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                  제품을 완벽히 아는 AI CPO
                </h1>
                <p className="mx-auto text-base leading-7 text-muted-foreground md:text-lg md:whitespace-nowrap">
                  코딩 에이전트에게 제품 맥락을 이해시켜야, 24시간 믿고 맡길 수 있습니다.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <LandingBetaSignup />
              </div>
            </div>

            <div className="flex w-full items-center justify-center pt-2 md:pt-4">
              <LandingHeroPrompt />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
