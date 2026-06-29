"use client";

import { useMemo, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

const FAQ_COUNT = 13;

export function LandingFaq() {
  const { t } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = useMemo(
    () =>
      Array.from({ length: FAQ_COUNT }, (_, index) => ({
        question: t(`landing.faq.q${index}Question`),
        summary: t(`landing.faq.q${index}Summary`),
        answer: t(`landing.faq.q${index}Answer`),
      })),
    [t],
  );

  return (
    <section id="faq" className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {t("landing.faq.heading")}
        </h2>

        <div
          className="border-border divide-border mt-12 divide-y overflow-hidden rounded-lg border md:mt-16"
          data-testid="landing-faq-list"
        >
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  data-testid={`landing-faq-item-${index}`}
                  className={cn(
                    "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-4 text-left transition-colors md:px-5 md:py-5",
                    isOpen && "bg-muted/30",
                  )}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-medium md:text-base">
                      {item.question}
                    </span>
                    {!isOpen ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs md:text-sm">
                        {item.summary}
                      </p>
                    ) : null}
                  </div>
                  <CaretRightIcon
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform duration-300",
                      isOpen && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-muted-foreground px-4 pt-4 pb-5 text-sm leading-7 md:px-5 md:pt-5 md:pb-6 md:text-[15px] md:leading-8">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
