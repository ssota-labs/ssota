import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@/lib/utils";

type SlideFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  slideNumber: number;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

const railSteps = ["Human intent", "Spec", "Agent work", "Evidence", "Approval"];

export function SlidePrintStyles() {
  return (
    <style>{`
      @page {
        size: 13.333in 7.5in;
        margin: 0;
      }

      @media print {
        html,
        body {
          width: 13.333in;
          min-height: 7.5in;
          background: var(--background);
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .pitch-deck-shell {
          background: var(--background);
        }

        .deck-slide {
          width: 13.333in !important;
          height: 7.5in !important;
          min-height: 7.5in !important;
          break-after: page;
          page-break-after: always;
          box-shadow: none !important;
          border-radius: 0 !important;
        }

        .deck-slide:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .screen-only {
          display: none !important;
        }
      }
    `}</style>
  );
}

function DecisionRail() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
      {railSteps.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-muted/40 px-2 py-1">
            {step}
          </span>
          {index < railSteps.length - 1 ? (
            <span className="h-px w-5 bg-border" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SlideFrame({
  eyebrow,
  title,
  subtitle,
  slideNumber,
  children,
  className,
  contentClassName,
}: SlideFrameProps) {
  return (
    <section
      className={cn(
        "deck-slide relative mx-auto flex aspect-video min-h-[min(100vh,56.25vw)] w-full max-w-[1600px] flex-col overflow-hidden border border-border bg-background shadow-2xl shadow-primary/5",
        className,
      )}
      data-testid={`pitch-slide-${slideNumber}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      >
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-12 right-10 h-56 w-56 rounded-full bg-muted blur-3xl" />
        <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-8 px-14 pt-10">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            {eyebrow ? (
              <Badge variant="outline" className="bg-background/70">
                {eyebrow}
              </Badge>
            ) : null}
            <span className="font-mono text-xs text-muted-foreground">
              Pax Humana / SSOTA
            </span>
          </div>
          <div className="max-w-5xl space-y-3">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-3xl text-pretty text-lg leading-7 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs text-muted-foreground">slide</p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {String(slideNumber).padStart(2, "0")}
          </p>
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col px-14 pb-10 pt-8",
          contentClassName,
        )}
      >
        {children}
      </main>

      <footer className="relative z-10 flex items-center justify-between gap-6 border-t border-border bg-card/60 px-14 py-4">
        <DecisionRail />
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          The AI CPO for your Agent Team
        </p>
      </footer>
    </section>
  );
}
