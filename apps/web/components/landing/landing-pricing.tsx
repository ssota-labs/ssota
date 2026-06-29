import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { cn } from "@/lib/utils";
import { getLandingTranslations } from "@/lib/i18n/server";
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";

export async function LandingPricing() {
  const { t } = await getLandingTranslations();

  const cloudPlans = [
    {
      name: "Free / Open Source",
      price: "$0",
      period: "",
      description: t("landing.pricing.freeDescription"),
      features: t("landing.pricing.freeFeatures").split("|"),
      cta: t("landing.pricing.freeCta"),
      highlighted: false,
      action: "coming-soon" as const,
    },
    {
      name: "Cloud Starter",
      price: "$20",
      period: "/ user / month",
      description: t("landing.pricing.starterDescription"),
      features: t("landing.pricing.starterFeatures").split("|"),
      cta: t("landing.beta.defaultTrigger"),
      highlighted: true,
      action: "beta" as const,
    },
    {
      name: "Cloud Business",
      price: "$50",
      period: "/ user / month",
      description: t("landing.pricing.businessDescription"),
      features: t("landing.pricing.businessFeatures").split("|"),
      cta: t("landing.beta.defaultTrigger"),
      highlighted: false,
      action: "beta" as const,
    },
  ];

  const enterpriseFeatures = t("landing.pricing.enterpriseFeatures").split("|");

  return (
    <section id="pricing" className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {t("landing.pricing.heading")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {cloudPlans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "flex flex-col border-border/60 bg-card/40 shadow-none",
                plan.highlighted && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.highlighted ? (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {t("landing.pricing.recommended")}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period ? (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  ) : null}
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2 text-sm">
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      weight="bold"
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                {plan.action === "beta" ? (
                  <LandingBetaSignup
                    triggerLabel={plan.cta}
                    triggerClassName="w-full"
                    triggerSize="default"
                  />
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                    aria-disabled
                  >
                    {plan.cta}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-border/60 bg-card/30 shadow-none">
          <CardHeader className="gap-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">Enterprise</CardTitle>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {t("landing.pricing.enterpriseBadge")}
                </Badge>
              </div>
              <CardDescription className="max-w-xl text-sm leading-6">
                {t("landing.pricing.enterpriseDescription")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {enterpriseFeatures.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm">
                  <CheckIcon
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    weight="bold"
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <LandingBetaSignup
              triggerLabel={t("landing.beta.enterpriseTrigger")}
              triggerVariant="outline"
              triggerClassName="sm:w-auto"
            />
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
