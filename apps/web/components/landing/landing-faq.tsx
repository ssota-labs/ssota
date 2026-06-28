"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ssota/ui/components/ui/accordion";

const faqItems = [
  {
    question: "기획·개발 경험이 없어도 사용할 수 있나요?",
    answer:
      "SSOTA는 코딩 에이전트를 이미 쓰는 팀을 위한 제품 맥락 레이어입니다. 기술 창업자, 소규모 제품팀, PM·기획자, 개발 외주사처럼 Claude Code, Cursor, Codex로 병렬 개발을 하는 분들이 가장 먼저 체감하는 가치를 얻습니다. 사람은 문서를 처음부터 쓰기보다 에이전트가 정리한 PRD, 정책, 기술 설계, 구현 결과를 웹에서 검토하고 승인하는 역할에 집중할 수 있습니다.",
  },
  {
    question: "에이전트가 만든 결과물은 얼마나 정확한가요?",
    answer:
      "SSOTA는 요구사항·스펙·정책·결정·구현 결과를 의사결정 그래프로 연결해, 에이전트가 작업 전 어떤 맥락을 읽고 작업 후 무엇을 남겨야 하는지 워크플로우 지침으로 정합니다. 제품 목표, 고객 가설, 핵심 기능, 승인 기준을 구체적으로 쌓을수록 에이전트의 판단과 산출물이 제품 의도에 더 잘 맞습니다.",
  },
  {
    question: "내 제품 데이터가 AI 학습에 사용되나요?",
    answer:
      "SSOTA 클라우드는 학습 미사용 약관이 적용된 기업용 API 채널로 외부 AI를 호출하도록 설계합니다. 입력한 제품 맥락이 모델 학습에 쓰이지 않도록 하는 것이 기본 원칙입니다. 셀프 호스팅(오픈소스)을 쓰는 경우에는 사용하는 AI 제공자와 조직 정책에 따릅니다. 서비스 품질 개선을 위한 데이터 활용은 별도 동의가 있는 경우에만 진행합니다.",
  },
  {
    question: "SSOTA MCP로 무엇을 할 수 있나요?",
    answer:
      "Claude Code, Cursor, Codex 같은 기존 코딩 에이전트에 SSOTA MCP를 연결하면, 에이전트가 작업 전 제품 목표·스펙·정책·결정 이력을 읽고, 작업 후 PRD, 기술 설계, 구현 결과, 테스트 결과, 판단 근거를 다시 SSOTA에 기록합니다. 별도 문서 가공 없이 기획 맥락 그대로 개발 단계로 이어지고, 사람은 웹 화면에서 검토·승인해 다음 에이전트가 참조할 유효한 맥락으로 만듭니다.",
  },
  {
    question: "SSOTA는 유료 서비스인가요?",
    answer:
      "핵심 기능은 오픈소스로 무료 사용할 수 있습니다. 서버 운영·업데이트·보안 관리가 부담되는 팀은 SSOTA 클라우드(Starter $20, Business $50 / user / month)를 구독할 수 있으며, 기업 고객은 맞춤형 워크플로우·연동·전용 배포를 별도 협의합니다. 지불하는 것은 문서 도구가 아니라 에이전트팀이 제품 의도에 맞게 일하도록 만드는 운영 레이어입니다.",
  },
  {
    question: "SSOTA 직원이 제 기획·제품 데이터를 볼 수 있나요?",
    answer:
      "시스템 운영·장애 대응 등 정당한 사유가 있는 경우 최소 인원만 접근할 수 있으며, 접근 기록을 남깁니다. 마케팅·분석 등 다른 목적으로는 열람하지 않습니다. 엔터프라이즈 플랜에서는 SSO, 권한 관리, 감사 로그, 데이터 보존 정책을 추가로 제공합니다.",
  },
  {
    question: "회사에서 ChatGPT 사용이 막혀 있는데 SSOTA는 괜찮나요?",
    answer:
      "일반 ChatGPT는 설정에 따라 대화가 모델 학습에 활용될 수 있어 사내 보안 정책으로 제한되는 경우가 많습니다. SSOTA 클라우드는 학습 미사용 약관의 기업용 API 경로를 전제로 설계했습니다. 조직 정책에 따라 셀프 호스팅·전용 VPC 배포도 검토할 수 있으니, 도입 전 담당자와 함께 확인하시길 권장합니다.",
  },
  {
    question: "문의나 협업 요청은 어디로 하면 되나요?",
    answer: "contact@ssota.ai 로 언제든 연락 주세요. 엔터프라이즈 도입·파트너 프로그램·베타 참여 문의도 환영합니다.",
  },
] as const;

export function LandingFaq() {
  return (
    <section id="faq" className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          궁금한 점들이 더 있나요?
        </h2>

        <Accordion className="mt-12 w-full" multiple>
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
