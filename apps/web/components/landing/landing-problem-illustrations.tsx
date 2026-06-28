type IllustrationProps = {
  gradientId: string;
};

function IllustrationDefs({ gradientId }: { gradientId: string }) {
  return (
    <defs>
      <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
        <stop offset="55%" stopColor="var(--color-primary)" stopOpacity="0.7" />
        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.15" />
      </linearGradient>
      <radialGradient id={`${gradientId}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.45" />
        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** 카드1 — 서로 다른 소스가 쌓여 있고, 어느 게 진실인지 모름 */
function ScatteredSourcesIllustration({ gradientId }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 132"
      className="h-32 w-[13rem] text-primary"
      fill="none"
      aria-hidden
    >
      <IllustrationDefs gradientId={gradientId} />
      <circle cx="120" cy="74" r="62" fill={`url(#${gradientId}-glow)`} />

      {/* 쌓인 문서 카드들 (각각 다른 소스, 서로 어긋남) */}
      <g className="stroke-primary/35" strokeWidth="1.5">
        <rect
          x="40"
          y="70"
          width="78"
          height="46"
          rx="8"
          fill={`url(#${gradientId}-fill)`}
          transform="rotate(-9 79 93)"
        />
        <rect
          x="78"
          y="58"
          width="78"
          height="46"
          rx="8"
          fill={`url(#${gradientId}-fill)`}
          transform="rotate(6 117 81)"
        />
        <rect
          x="62"
          y="40"
          width="80"
          height="48"
          rx="8"
          fill="var(--color-card)"
          className="stroke-primary/55"
        />
      </g>

      {/* 맨 위 카드의 텍스트 라인 */}
      <g className="stroke-primary/40" strokeWidth="2.5" strokeLinecap="round">
        <line x1="74" y1="54" x2="118" y2="54" />
        <line x1="74" y1="63" x2="106" y2="63" />
        <line x1="74" y1="72" x2="112" y2="72" />
      </g>

      {/* 어느 게 최신인지 모름 → 물음표 배지 */}
      <g transform="translate(150 36)">
        <circle r="16" className="fill-primary/15 stroke-primary/60" strokeWidth="1.5" />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          className="fill-primary"
          fontSize="20"
          fontWeight="700"
        >
          ?
        </text>
      </g>
    </svg>
  );
}

/** 카드2 — 하나의 일이 에이전트마다 다른 결과로 갈라짐 */
function DivergingAgentsIllustration({ gradientId }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 132"
      className="h-32 w-[13rem] text-primary"
      fill="none"
      aria-hidden
    >
      <IllustrationDefs gradientId={gradientId} />
      <circle cx="150" cy="66" r="58" fill={`url(#${gradientId}-glow)`} />

      {/* 분기 경로 */}
      <g fill="none" strokeLinecap="round">
        <path
          d="M44 66 C92 66, 104 26, 156 26"
          stroke={`url(#${gradientId}-line)`}
          strokeWidth="2.5"
        />
        <path
          d="M44 66 C92 66, 104 66, 156 66"
          stroke={`url(#${gradientId}-line)`}
          strokeWidth="2.5"
          strokeDasharray="2 6"
        />
        <path
          d="M44 66 C92 66, 104 106, 156 106"
          stroke={`url(#${gradientId}-line)`}
          strokeWidth="2.5"
        />
      </g>

      {/* 입력 노드 (하나의 작업) */}
      <g transform="translate(40 66)">
        <circle r="13" className="fill-primary/15 stroke-primary/60" strokeWidth="1.5" />
        <rect x="-5" y="-4" width="10" height="8" rx="2" className="fill-primary" />
      </g>

      {/* 엇갈린 결과 노드 3개 (서로 다른 모양) */}
      <g className="stroke-primary/55" strokeWidth="1.5">
        <rect
          x="156"
          y="17"
          width="36"
          height="18"
          rx="9"
          fill={`url(#${gradientId}-fill)`}
        />
        <rect
          x="156"
          y="57"
          width="36"
          height="18"
          rx="4"
          fill={`url(#${gradientId}-fill)`}
        />
        <rect
          x="156"
          y="97"
          width="36"
          height="18"
          rx="9"
          fill={`url(#${gradientId}-fill)`}
        />
      </g>
      <circle cx="174" cy="26" r="2.5" className="fill-primary" />
      <circle cx="174" cy="66" r="2.5" className="fill-primary" />
      <circle cx="174" cy="106" r="2.5" className="fill-primary" />
    </svg>
  );
}

/** 카드3 — 사람이 다시 의도를 맞추는 반복 루프 */
function AlignmentWorkloadIllustration({ gradientId }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 132"
      className="h-32 w-[13rem] text-primary"
      fill="none"
      aria-hidden
    >
      <IllustrationDefs gradientId={gradientId} />
      <circle cx="124" cy="66" r="58" fill={`url(#${gradientId}-glow)`} />

      {/* 반복 루프 화살표 */}
      <g fill="none">
        <path
          d="M150 44 A42 42 0 1 1 92 44"
          stroke={`url(#${gradientId}-line)`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M150 44 l-10 -7 m10 7 l-7 10"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 중앙: 사람이 손으로 맞추는 조정 노드 */}
      <g transform="translate(124 70)">
        <circle r="20" className="fill-primary/12 stroke-primary/50" strokeWidth="1.5" />
        {/* 슬라이더/조정 모티프 */}
        <line x1="-10" y1="-5" x2="10" y2="-5" className="stroke-primary/45" strokeWidth="2" strokeLinecap="round" />
        <line x1="-10" y1="5" x2="10" y2="5" className="stroke-primary/45" strokeWidth="2" strokeLinecap="round" />
        <circle cx="4" cy="-5" r="3.5" className="fill-primary" />
        <circle cx="-3" cy="5" r="3.5" className="fill-primary" />
      </g>

      {/* 반복을 암시하는 작은 노드 두 개 */}
      <circle cx="92" cy="44" r="4" className="fill-primary/70" />
      <circle cx="160" cy="96" r="3" className="fill-primary/45" />
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
    <div className="pointer-events-none absolute -right-2 -bottom-1 z-0 opacity-95 md:right-0 md:bottom-0">
      <Illustration gradientId={`problem-${variant}`} />
    </div>
  );
}
