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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { getConnectors } from "@/lib/connect/connectors";
import { getLandingTranslations } from "@/lib/i18n/server";
import type { createTranslator } from "@/lib/i18n";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";
import { LandingBlurredBackground } from "@/components/landing/landing-blurred-background";
import { LandingDarkMode } from "@/components/landing/landing-dark-mode";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { landingGlassPanelClassName } from "@/components/landing/landing-glass-surface";
import { LandingGithubButton } from "@/components/landing/landing-github-button";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingLocaleSwitcher } from "@/components/landing/landing-locale-switcher";
import { LandingFeatureShowcase } from "@/components/landing/landing-feature-showcase";
import { LandingHeroPrompt } from "@/components/landing/landing-hero-prompt";
import { LandingPricing } from "@/components/landing/landing-pricing";

type Translator = ReturnType<typeof createTranslator>;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getLandingTranslations();
  return {
    title: t("landing.meta.title"),
    description: t("landing.meta.description"),
  };
}

function buildProblemCards(t: Translator): ReadonlyArray<{
  title: string;
  detailLines: readonly string[];
  highlights: readonly string[];
  icon: Icon;
}> {
  return [
    {
      title: t("landing.problem.card1Title"),
      detailLines: t("landing.problem.card1Lines").split("|"),
      highlights: t("landing.problem.card1Highlights").split("|"),
      icon: FileDashedIcon,
    },
    {
      title: t("landing.problem.card2Title"),
      detailLines: t("landing.problem.card2Lines").split("|"),
      highlights: t("landing.problem.card2Highlights").split("|"),
      icon: TreeStructureIcon,
    },
    {
      title: t("landing.problem.card3Title"),
      detailLines: t("landing.problem.card3Lines").split("|"),
      highlights: t("landing.problem.card3Highlights").split("|"),
      icon: ArrowsClockwiseIcon,
    },
  ];
}

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
  const connectors = getConnectors();
  const { locale, messages, t } = await getLandingTranslations();
  const problemCards = buildProblemCards(t);

  return (
    <LocaleProvider locale={locale} messages={messages}>
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingDarkMode />

      <LandingHeader>
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <div className="flex flex-1 items-center justify-start">
            <Link
              href="/home"
              className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md"
                aria-hidden
              >
                <Image
                  src="/landing/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  priority
                  className="size-7 object-contain mix-blend-screen"
                />
              </span>
              SSOTA
            </Link>
          </div>
          <nav className="hidden shrink-0 items-center gap-6 text-sm text-white/85 group-data-[scrolled=true]:text-muted-foreground md:flex">
            <a
              href="#problem"
              className="transition-colors hover:text-white group-data-[scrolled=true]:hover:text-foreground"
            >
              {t("landing.nav.problem")}
            </a>
            <a
              href="#solution"
              className="transition-colors hover:text-white group-data-[scrolled=true]:hover:text-foreground"
            >
              {t("landing.nav.solution")}
            </a>
            <a
              href="#pricing"
              className="transition-colors hover:text-white group-data-[scrolled=true]:hover:text-foreground"
            >
              {t("landing.nav.pricing")}
            </a>
            <a
              href="#faq"
              className="transition-colors hover:text-white group-data-[scrolled=true]:hover:text-foreground"
            >
              {t("landing.nav.faq")}
            </a>
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            <LandingLocaleSwitcher />
            <LandingGithubButton />
          </div>
        </div>
      </LandingHeader>

      <section className="relative isolate overflow-hidden">
        <LandingBlurredBackground priority />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16 lg:py-20">
          <div className="mx-auto flex w-full flex-col items-center gap-12 md:gap-16">
            <div className="max-w-2xl space-y-4 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                {t("landing.hero.title")}
              </h1>
              <p className="mx-auto text-base leading-7 text-foreground/90 text-balance md:text-lg">
                {t("landing.hero.subtitle")}
              </p>
            </div>

            <div className="flex w-full flex-col items-center">
              <LandingHeroPrompt />
              <div className="mt-10 flex flex-col items-center gap-2 md:mt-12">
                <Badge
                  variant="outline"
                  className="border-border/50 bg-background/50 backdrop-blur-sm"
                >
                  {t("landing.hero.badge")}
                </Badge>
                <LandingBetaSignup triggerClassName="h-11 px-6 text-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="bg-background">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-32 md:py-40">
          <h2 className="text-center text-3xl font-semibold leading-[1.25] tracking-tight text-balance md:text-5xl md:leading-[1.2] lg:text-[3.25rem]">
            <span className="block text-muted-foreground">
              {t("landing.problem.headingTop")}
            </span>
            <span className="mt-4 block text-foreground">
              {t("landing.problem.headingBottom")}
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
            {t("landing.solution.heading")}
          </h2>

          <LandingFeatureShowcase connectors={connectors} />
        </div>
      </section>

      <LandingPricing />
      <LandingFaq />

      <section className="relative isolate overflow-hidden px-6 py-20">
        <LandingBlurredBackground />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className={landingGlassPanelClassName("p-8 md:p-12")}>
            <Badge
              variant="outline"
              className="border-border/50 bg-background/50 backdrop-blur-sm"
            >
              {t("landing.cta.badge")}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              {t("landing.cta.heading")}
            </h2>
            <div className="mt-8 flex justify-center">
              <LandingBetaSignup triggerClassName="h-11 px-6 text-sm" />
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
    </LocaleProvider>
  );
}
