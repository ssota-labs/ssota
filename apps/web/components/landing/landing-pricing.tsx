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
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";

const cloudPlans = [
  {
    name: "Free / Open Source",
    price: "$0",
    period: "",
    description: "직접 설치해 무료로 시작",
    features: [
      "오픈소스 코어 전체 기능",
      "셀프 호스팅·직접 운영",
      "배포·업데이트·보안 직접 관리",
      "초기 팀·개인 개발자에 적합",
    ],
    cta: "오픈 소스 공개 예정",
    highlighted: false,
    action: "coming-soon" as const,
  },
  {
    name: "Cloud Starter",
    price: "$20",
    period: "/ user / month",
    description: "소규모 팀의 관리형 클라우드",
    features: [
      "의사결정 그래프·워크플로우 지침",
      "MCP 연결·에이전트 작업 로그",
      "승인 플로우·클라우드 호스팅",
      "서버 운영 없이 바로 시작",
    ],
    cta: "베타 알림 받기",
    highlighted: true,
    action: "beta" as const,
  },
  {
    name: "Cloud Business",
    price: "$100",
    period: "/ user / month",
    description: "조직 단위 운영 레이어",
    features: [
      "Starter의 모든 기능",
      "조직 전체 거버넌스·감사",
      "고급 승인·데이터 보존 정책",
      "우선 지원·안정적 SLA",
    ],
    cta: "베타 알림 받기",
    highlighted: false,
    action: "beta" as const,
  },
] as const;

const enterpriseFeatures = [
  "맞춤형 개발 워크플로우·문서 구조 설계",
  "커스텀 에이전트 지침·사내 도구 연동 플러그인",
  "SSO, 권한 관리, 감사 로그",
  "전용 클라우드/VPC 배포, SLA, 전담 지원",
];

export function LandingPricing() {
  return (
    <section id="pricing" className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            부담 없이 시작하세요
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            핵심 기능은 오픈소스로 무료. 서버 운영이 부담되면 SSOTA 클라우드로
            AI 에이전트팀이 제품 의도에 맞게 일하도록 만드는 운영 레이어를
            구독하세요.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      추천
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
          <CardHeader className="gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">Enterprise</CardTitle>
              <CardDescription className="max-w-xl text-sm leading-6">
                기업 고객을 위한 맞춤형 구축. 개발 프로세스·문서 체계·승인
                구조·사내 도구에 맞춰 SSOTA가 직접 설계하고 배포합니다. 가격은
                규모와 요구사항에 따라 협의합니다.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit shrink-0">
              맞춤 견적
            </Badge>
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
              triggerLabel="도입 문의 · 베타 알림"
              triggerVariant="outline"
              triggerClassName="sm:w-auto"
            />
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
