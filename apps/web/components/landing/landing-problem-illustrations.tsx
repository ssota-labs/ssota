import { cn } from "@/lib/utils";

function SourcePill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary/90 shadow-[0_0_16px] shadow-primary/10 backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}

function ScatteredSourcesIllustration() {
  return (
    <div className="relative h-28 w-full max-w-[11rem]" aria-hidden>
      <SourcePill label="PRD" className="left-0 top-1 -rotate-6" />
      <SourcePill label="슬랙" className="left-8 top-10 rotate-3" />
      <SourcePill label="Notion" className="right-1 top-0 rotate-8" />
      <SourcePill label="레포" className="right-4 top-12 -rotate-4" />
      <div className="absolute bottom-2 left-6 size-14 rounded-full bg-primary/5 blur-xl" />
    </div>
  );
}

function DivergingAgentsIllustration() {
  return (
    <svg
      viewBox="0 0 160 96"
      className="h-24 w-full max-w-[10rem] text-primary/80"
      aria-hidden
    >
      <circle cx="24" cy="48" r="6" className="fill-primary/30" />
      <circle cx="24" cy="48" r="2.5" className="fill-primary" />
      <path
        d="M30 44 C52 24, 78 20, 118 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        className="opacity-70"
      />
      <path
        d="M30 52 C54 68, 82 72, 122 76"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        className="opacity-70"
      />
      <rect
        x="118"
        y="10"
        width="28"
        height="16"
        rx="8"
        className="fill-primary/15 stroke-primary/40"
        strokeWidth="1"
      />
      <rect
        x="122"
        y="68"
        width="28"
        height="16"
        rx="8"
        className="fill-primary/15 stroke-primary/40"
        strokeWidth="1"
      />
      <circle cx="132" cy="18" r="2" className="fill-primary" />
      <circle cx="136" cy="76" r="2" className="fill-primary" />
    </svg>
  );
}

function AlignmentWorkloadIllustration() {
  return (
    <svg
      viewBox="0 0 160 96"
      className="h-24 w-full max-w-[10rem] text-primary/80"
      aria-hidden
    >
      <rect
        x="18"
        y="18"
        width="44"
        height="12"
        rx="6"
        className="fill-primary/10 stroke-primary/35"
        strokeWidth="1"
      />
      <rect
        x="34"
        y="38"
        width="52"
        height="12"
        rx="6"
        className="fill-primary/15 stroke-primary/40"
        strokeWidth="1"
      />
      <rect
        x="22"
        y="58"
        width="40"
        height="12"
        rx="6"
        className="fill-primary/10 stroke-primary/35"
        strokeWidth="1"
      />
      <path
        d="M96 48 C108 48, 118 42, 128 48 C138 54, 146 48, 152 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-80"
      />
      <circle cx="152" cy="48" r="10" className="fill-primary/20 stroke-primary/50" strokeWidth="1" />
      <path
        d="M148 48 L151 51 L156 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const illustrations = {
  sources: ScatteredSourcesIllustration,
  diverge: DivergingAgentsIllustration,
  align: AlignmentWorkloadIllustration,
} as const;

export type ProblemIllustrationVariant = keyof typeof illustrations;

export function LandingProblemIllustration({
  variant,
}: {
  variant: ProblemIllustrationVariant;
}) {
  const Illustration = illustrations[variant];

  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-0 opacity-90 md:right-4 md:bottom-4">
      <Illustration />
    </div>
  );
}
